import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui/Button'
import { DIALOG_PRIMARY_BUTTON } from '../ui/dialogStyles'
import { usePlatform } from '../../lib/platform/usePlatform'
import { pushBackHandler } from '../../lib/platform/backHandlers'
import { getGroupById } from '../../lib/db/groups'
import { onNoteChecked } from '../../lib/onboarding/noteCheckEvents'
import { requestShowGroup } from '../../lib/onboarding/boardFocus'
import type { Tour, TourContext, TourStep } from '../../lib/onboarding/tours'

/** Gap between the spotlighted element and the hole's edge. */
const PAD = 6
/** Gap between the hole and the callout (desktop). */
const CALLOUT_GAP = 14
/** How long a step waits for its element before it is skipped. */
const FIND_TIMEOUT_MS = 4000
/** Let the check animation settle before showing what happened. */
const AFTER_CHECK_MS = 350

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const DIM = 'pointer-events-auto fixed bg-ink/60 dark:bg-black/60'

function resolve<T>(value: T | ((ctx: TourContext) => T), ctx: TourContext): T {
  return typeof value === 'function' ? (value as (ctx: TourContext) => T)(ctx) : value
}

/**
 * Draws one tour: a hard-edged hole in an ink dim (four dim rectangles around the target,
 * plus a white-and-violet outline — no blur or feathering, per the style guide) and a paper
 * callout beside it. The dim rectangles also swallow taps outside the hole, so the app
 * underneath is only reachable through the spotlighted element, and only on a `'check'`
 * step; on every other step a transparent panel covers the hole too.
 *
 * A step whose element never appears (customised or synced board, the other layout) is
 * skipped. Finishing and skipping both end in `onFinish`: a tour never runs twice.
 * Android Back steps out of the tour like it does a modal. See `docs/feat-onboarding.md`.
 */
export function TourOverlay({ tour, onFinish: onEnd }: { tour: Tour; onFinish: (shown: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const [movedTo, setMovedTo] = useState<string | null>(null)
  // Whether the user actually saw a step. A tour whose elements never showed up (e.g. the
  // Settings tour opened on the About tab) ends without counting as seen, so it can run
  // again when they can.
  const shown = useRef(false)
  const onFinish = useCallback(() => onEnd(shown.current), [onEnd])

  const step: TourStep | undefined = tour.steps[index]
  const isLast = index === tour.steps.length - 1
  const advance = useCallback(() => {
    if (isLast) onFinish()
    else setIndex((i) => i + 1)
  }, [isLast, onFinish])

  // Escape and Android Back leave the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish()
    }
    document.addEventListener('keydown', onKey)
    const popBack = pushBackHandler(onFinish)
    return () => {
      document.removeEventListener('keydown', onKey)
      popBack()
    }
  }, [onFinish])

  // Steps ran out (e.g. every remaining element was missing).
  useEffect(() => {
    if (!step) onFinish()
  }, [step, onFinish])

  if (!step) return null
  return (
    <TourStepLayer
      // A fresh layer per step: its measurement state starts empty instead of being reset.
      key={index}
      step={step}
      index={index}
      total={tour.steps.length}
      movedTo={movedTo}
      onAdvance={advance}
      onShown={() => {
        shown.current = true
      }}
      onChecked={(name, groupId) => {
        setMovedTo(name)
        // Mobile shows one group at a time: bring the board to where the note went, so
        // the next step can point at it (a no-op on desktop, where nothing subscribes).
        if (groupId) requestShowGroup(groupId)
        setIndex((i) => i + 1)
      }}
      onFinish={onFinish}
    />
  )
}

interface TourStepLayerProps {
  step: TourStep
  index: number
  total: number
  movedTo: string | null
  onAdvance: () => void
  /** The step's element was found and the callout is on screen. */
  onShown: () => void
  /** A 'check' step saw a note get checked; `name`/`groupId` are the group it moved to, if any. */
  onChecked: (name: string | null, groupId: string | null) => void
  onFinish: () => void
}

function TourStepLayer({ step, index, total, movedTo, onAdvance, onShown, onChecked, onFinish }: TourStepLayerProps) {
  const { isMobile } = usePlatform()
  const ctx: TourContext = { movedTo, isMobile }
  const selector = typeof step.selector === 'function' ? step.selector(ctx) : step.selector
  const [box, setBox] = useState<Box | null>(null)
  const [ready, setReady] = useState(!selector)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  const isLast = index === total - 1

  // Find and follow this step's element.
  useEffect(() => {
    if (!selector) return
    let raf = 0
    let timer = 0
    let tracked: Element | null = null
    let last = ''

    const track = () => {
      if (!tracked) return
      if (!tracked.isConnected) {
        // The element left the page (a re-render replaced it): look it up again, else move on.
        tracked = document.querySelector(selector)
        if (!tracked) {
          onAdvance()
          return
        }
      }
      const r = tracked.getBoundingClientRect()
      const key = `${r.x}|${r.y}|${r.width}|${r.height}|${window.innerWidth}|${window.innerHeight}`
      if (key !== last) {
        last = key
        setBox({ x: r.x, y: r.y, w: r.width, h: r.height })
        setViewport({ w: window.innerWidth, h: window.innerHeight })
      }
      raf = requestAnimationFrame(track)
    }

    const startedAt = Date.now()
    const find = () => {
      const el = document.querySelector(selector)
      const r = el?.getBoundingClientRect()
      if (el && r && r.width > 0 && r.height > 0) {
        tracked = el
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: reduced ? 'auto' : 'smooth' })
        setReady(true)
        track()
        return
      }
      if (Date.now() - startedAt > FIND_TIMEOUT_MS) {
        onAdvance()
        return
      }
      timer = window.setTimeout(find, 100)
    }
    timer = window.setTimeout(find, 0)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [selector, onAdvance])

  // A 'check' step ends when the user checks any note. The callback is read through a ref:
  // the parent re-renders for unrelated reasons (sync, flags), and a new callback identity
  // would otherwise re-subscribe and cancel the pending advance after the check.
  const onCheckedRef = useRef(onChecked)
  useEffect(() => {
    onCheckedRef.current = onChecked
  }, [onChecked])
  useEffect(() => {
    if (step.advance !== 'check') return
    let timer = 0
    let fired = false
    const off = onNoteChecked((event) => {
      if (fired) return
      fired = true
      const finish = (name: string | null) => {
        timer = window.setTimeout(() => onCheckedRef.current(name, event.movedToGroupId), AFTER_CHECK_MS)
      }
      if (event.movedToGroupId) {
        getGroupById(event.movedToGroupId).then(
          (group) => finish(group?.name ?? null),
          () => finish(null),
        )
      } else {
        finish(null)
      }
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [step])

  // Reported once the callout is really on screen (a step with no selector is ready at once).
  useEffect(() => {
    if (ready) onShown()
  }, [ready, onShown])

  if (!ready) return null

  const interactive = step.advance === 'check'
  const hole = box
    ? { left: box.x - PAD, top: box.y - PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }
    : null

  let calloutPlacement: CSSProperties = {}
  let calloutClass = 'fixed inset-0 flex items-center justify-center p-4'
  if (hole && isMobile) {
    const targetIsLow = hole.top + hole.height / 2 > viewport.h * 0.55
    calloutClass = 'fixed inset-x-0 flex justify-center px-3'
    calloutPlacement = targetIsLow
      ? { top: 'calc(env(safe-area-inset-top) + 12px)' }
      : { bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }
  } else if (hole) {
    const width = 320
    const left = Math.min(Math.max(hole.left + hole.width / 2 - width / 2, 12), viewport.w - width - 12)
    const fitsBelow = hole.top + hole.height + CALLOUT_GAP + 190 < viewport.h
    calloutClass = 'fixed'
    calloutPlacement = fitsBelow
      ? { left, top: hole.top + hole.height + CALLOUT_GAP }
      : { left, bottom: viewport.h - hole.top + CALLOUT_GAP }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]" style={{ pointerEvents: 'none' }}>
      {hole ? (
        <>
          <div className={DIM} style={{ left: 0, top: 0, width: '100%', height: Math.max(hole.top, 0) }} />
          <div
            className={DIM}
            style={{ left: 0, top: hole.top + hole.height, width: '100%', bottom: 0 }}
          />
          <div
            className={DIM}
            style={{ left: 0, top: hole.top, width: Math.max(hole.left, 0), height: hole.height }}
          />
          <div
            className={DIM}
            style={{ left: hole.left + hole.width, top: hole.top, right: 0, height: hole.height }}
          />
          {!interactive && (
            <div
              className="pointer-events-auto fixed"
              style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }}
            />
          )}
          <div
            className="pointer-events-none fixed rounded-card border-[3px] border-white"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              boxShadow: '0 0 0 3px var(--color-accent-purple)',
            }}
          />
        </>
      ) : (
        <div className={`${DIM} inset-0`} />
      )}

      <div className={`pointer-events-none ${calloutClass}`} style={calloutPlacement}>
        <div
          role="dialog"
          aria-live="polite"
          aria-label={resolve(step.title, ctx)}
          className="onboarding-rise pointer-events-auto flex w-full max-w-[20rem] flex-col gap-3 rounded-card border-[3px] border-line bg-paper p-4 shadow-pop"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold text-fg">{resolve(step.title, ctx)}</h2>
            <p className="text-sm text-fg/80">{resolve(step.body, ctx)}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onFinish} className="text-sm font-medium text-fg/60 hover:text-fg">
              Skip
            </button>
            <div className="flex items-center gap-3">
              {total > 1 && (
                <span className="text-xs font-medium text-fg/50">
                  {index + 1} / {total}
                </span>
              )}
              {interactive ? (
                <span className="text-sm font-medium text-accent-purple">Give it a try</span>
              ) : (
                <Button onClick={onAdvance} className={`px-4 py-1.5 text-sm ${DIALOG_PRIMARY_BUTTON}`}>
                  {isLast ? 'Got it' : 'Next'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

