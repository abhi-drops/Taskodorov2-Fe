import { useCallback, useLayoutEffect, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import type { createBrowserRouter } from 'react-router'
import { isMobileLayout } from '../platform/mobileLayout'

/**
 * Page transitions: one visual vocabulary, chosen by *kind of navigation*. Square edges,
 * hard shadows and paper-like motion to match the board's neo-brutalist look. See
 * `docs/feat-navigation.md` ("Page transitions"); the CSS is in `index.css` under
 * `html[data-pt=…]`.
 *
 * | Navigation                 | Mobile                         | Desktop      |
 * |----------------------------|--------------------------------|--------------|
 * | Open a note from its card  | `note-open`: card morphs into the editor's card |  same  |
 * | Leave that note            | `note-close`: morphs back into the card          |  same  |
 * | Into the editor otherwise  | `sheet-in`: paper sheet slides in from the right | `fade` |
 * | Out of the editor          | `sheet-out`: the sheet slides back off           | `fade` |
 * | Between tabs               | `slide-next` / `slide-prev` (by tab order)       | `fade` |
 * | Same page, or anything else| `none` / `fade`                                  |        |
 *
 * How it fits together:
 * - Navigations opt in with React Router's own `viewTransition` (`<Link viewTransition>`,
 *   `navigate(to, { viewTransition: true })`). React Router then **replays a transition
 *   on back/forward (POP)** to any page that has had an animated navigation, which is
 *   what makes Android back, browser back and the editor's exits animate in reverse with
 *   no history interception.
 * - `installPageTransitions(router)` subscribes to the router and, on each location
 *   change, sets `<html data-pt="kind">` from the previous and next paths. React Router
 *   starts the view transition in a later effect, so the attribute is always in place
 *   first.
 * - A **ready gate**: it wraps `document.startViewTransition` so the browser's "after"
 *   snapshot waits until the new page reports its data loaded (`useTransitionReady`),
 *   capped at `READY_TIMEOUT_MS`. Without this the board and editor, which load from
 *   SQLite after mounting, would be captured empty, and the morph would have nothing to
 *   grow into.
 * - The **note morph** gives the tapped card and the editor's note card the same
 *   `view-transition-name` (`NOTE_MORPH_NAME`). Only that one note is ever named, and
 *   the name is cleared on any unrelated navigation, so it never leaks into other
 *   transitions or duplicates (a duplicate aborts the transition). The morph itself is
 *   a plain coloured block in the note's colour (`setNoteMorphColor`). The card's and
 *   editor's own content only fade, never stretch, so counter, list and status cards
 *   morph as cleanly as basic ones.
 */

export type PageTransitionKind =
  | 'note-open'
  | 'note-close'
  | 'sheet-in'
  | 'sheet-out'
  | 'slide-next'
  | 'slide-prev'
  | 'fade'
  | 'none'

export const NOTE_MORPH_NAME = 'note-morph'
const MORPH_ATTR = 'data-vt-morph'
/** Upper bound on holding the "after" snapshot for data; a cold first SQLite read can take a few hundred ms. */
const READY_TIMEOUT_MS = 500

// ---------------------------------------------------------------- note morph state

/** The note currently being morphed (opened from its card), if any. */
let morphNoteId: string | null = null

/**
 * `view-transition-name` for a note card or the editor's note card: the shared morph
 * name only for the note being morphed, otherwise none. Read at render, so the board's
 * card re-acquires the name when the board remounts on the way back.
 */
export function noteMorphName(noteId: string | null | undefined): string | undefined {
  return noteId && noteId === morphNoteId ? NOTE_MORPH_NAME : undefined
}

/**
 * Call before a navigation that shouldn't morph back into a card (e.g. after deleting
 * the note). Strips the morph name from **every** element carrying it: both the card
 * `useOpenNote` named by hand (marked with `MORPH_ATTR`) and any element React named at
 * render via `noteMorphName` (e.g. the card the board re-rendered on the way back).
 *
 * This matters because two elements with the same `view-transition-name` make the
 * browser abort the whole transition. That was the "doesn't morph the first time" bug:
 * after closing note A, its card kept the name, so tapping card B produced a duplicate.
 */
export function clearNoteMorph() {
  morphNoteId = null
  document
    .querySelectorAll<HTMLElement>(`[${MORPH_ATTR}], [style*="${NOTE_MORPH_NAME}"]`)
    .forEach((el) => {
      el.style.viewTransitionName = ''
      el.removeAttribute(MORPH_ATTR)
    })
}

/**
 * The colour of the morphing block (the note's sticky colour). The morph animates a
 * plain coloured rectangle rather than stretching card screenshots; see `index.css`.
 * Set on open from the card, and kept current by the editor so a colour change made
 * while editing morphs back in the new colour.
 */
export function setNoteMorphColor(color: string) {
  document.documentElement.style.setProperty('--pt-morph-color', `var(--color-sticky-${color})`)
}

// ---------------------------------------------------------------- ready gate

let pendingReady = 0
let readyWaiters: Array<() => void> = []

function settleReady() {
  if (pendingReady > 0) return
  const waiters = readyWaiters
  readyWaiters = []
  waiters.forEach((resolve) => resolve())
}

function waitForReady(): Promise<void> {
  if (pendingReady === 0) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, READY_TIMEOUT_MS)
    readyWaiters.push(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/**
 * Pages whose content loads after mount call this with their "loaded" flag, so a page
 * transition into them snapshots the loaded page instead of an empty one.
 */
export function useTransitionReady(ready: boolean) {
  useLayoutEffect(() => {
    if (ready) return
    pendingReady++
    return () => {
      pendingReady--
      settleReady()
    }
  }, [ready])
}

// ---------------------------------------------------------------- kind selection

const EDIT_PATH = /^\/notes\/([^/]+)\/edit$/

function isEditorPath(path: string) {
  return path === '/notes/new' || EDIT_PATH.test(path)
}

function editedNoteId(path: string) {
  return EDIT_PATH.exec(path)?.[1] ?? null
}

/** Mobile bottom-nav order; sub-pages belong to their tab. */
function tabIndex(path: string): number | null {
  if (path === '/') return 0
  if (path === '/apps' || path.startsWith('/apps/')) return 1
  if (path === '/settings' || path.startsWith('/settings/')) return 2
  return null
}

export function pageTransitionKind(from: string, to: string): PageTransitionKind {
  if (from === to) return 'none'

  // Read per navigation: on web the layout follows the window's width.
  const isMobile = isMobileLayout()
  const toEditor = isEditorPath(to)
  const fromEditor = isEditorPath(from)

  if (toEditor && !fromEditor) {
    if (morphNoteId && editedNoteId(to) === morphNoteId) return 'note-open'
    return isMobile ? 'sheet-in' : 'fade'
  }
  if (fromEditor && !toEditor) {
    if (morphNoteId && editedNoteId(from) === morphNoteId) return 'note-close'
    return isMobile ? 'sheet-out' : 'fade'
  }

  const fromTab = tabIndex(from)
  const toTab = tabIndex(to)
  if (isMobile && fromTab !== null && toTab !== null && fromTab !== toTab) {
    return toTab > fromTab ? 'slide-next' : 'slide-prev'
  }
  return 'fade'
}

// ---------------------------------------------------------------- install

type AppRouter = ReturnType<typeof createBrowserRouter>

let installed = false

export function installPageTransitions(router: AppRouter) {
  if (installed || typeof document === 'undefined') return
  installed = true

  // Ready gate: every view transition's update callback also waits for the new page's
  // data (see `useTransitionReady`) before the browser takes the "after" snapshot.
  if (typeof document.startViewTransition === 'function') {
    const native = document.startViewTransition.bind(document)
    document.startViewTransition = ((update?: unknown) => {
      if (typeof update !== 'function') return native(update as never)
      return native(async () => {
        await (update as () => unknown)()
        await waitForReady()
      })
    }) as Document['startViewTransition']
  }

  // The subscriber also fires for interim router states (e.g. navigation "loading") where
  // the location hasn't changed; every real navigation gets a new `location.key`.
  let previousPath = router.state.location.pathname
  let previousKey = router.state.location.key
  router.subscribe((state) => {
    if (state.location.key === previousKey) return
    previousKey = state.location.key
    const nextPath = state.location.pathname
    const kind = pageTransitionKind(previousPath, nextPath)
    if (kind !== 'note-open' && kind !== 'note-close') clearNoteMorph()
    document.documentElement.dataset.pt = kind
    previousPath = nextPath
  })
}

// ---------------------------------------------------------------- open a note

/**
 * Opens a note's editor from its card, morphing the card into the editor's note card.
 * Use as the card's `onClick`, passing the card's resolved sticky colour. Names the
 * clicked card *before* navigating, because the browser's "before" snapshot is taken
 * right after.
 */
export function useOpenNote() {
  const navigate = useNavigate()
  return useCallback(
    (event: MouseEvent<HTMLElement>, noteId: string, color: string) => {
      clearNoteMorph()
      morphNoteId = noteId
      setNoteMorphColor(color)
      event.currentTarget.style.viewTransitionName = NOTE_MORPH_NAME
      event.currentTarget.setAttribute(MORPH_ATTR, '')
      navigate(`/notes/${noteId}/edit`, { viewTransition: true })
    },
    [navigate],
  )
}
