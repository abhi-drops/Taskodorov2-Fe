import { useCallback, useSyncExternalStore } from 'react'

/**
 * Remembered layout of resizable/collapsible desktop sidebars (`SidePanel`): width and
 * collapsed state, per panel key. It is a tiny shared store, so a sidebar and the
 * toolbar button that toggles it (`SidebarToggle`, rendered elsewhere on the page) stay
 * in sync without prop-drilling or a context.
 *
 * **Synchronous `localStorage`, deliberately not `preferences.ts`.** Capacitor
 * Preferences is async, so a saved width would only arrive after the first paint and the
 * sidebar would visibly jump on every page open. These panels are desktop-only (web),
 * where Preferences is itself just `localStorage`, so nothing is lost. Every access is
 * guarded: storage can be unavailable or full, and layout must never break over it.
 */

export interface PanelLayout {
  /** `null` until the user resizes it, so each panel falls back to its own default. */
  width: number | null
  collapsed: boolean
}

const PREFIX = 'taskodoro.ui.panel.'
const DEFAULT_LAYOUT: PanelLayout = { width: null, collapsed: false }

function load(key: string): PanelLayout {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as Partial<PanelLayout>
    return {
      width: typeof parsed.width === 'number' && Number.isFinite(parsed.width) ? parsed.width : null,
      collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : false,
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

function save(key: string, layout: PanelLayout) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(layout))
  } catch {
    // Unavailable or full storage: the layout just isn't remembered this time.
  }
}

const cache = new Map<string, PanelLayout>()
const listeners = new Map<string, Set<() => void>>()

function read(key: string): PanelLayout {
  let layout = cache.get(key)
  if (!layout) {
    layout = load(key)
    cache.set(key, layout)
  }
  return layout
}

/**
 * Updates a panel's layout and notifies everything showing it. `persist: false` is for
 * high-frequency updates (each pointer move of a drag); persist once when it settles.
 */
export function updatePanelLayout(key: string, patch: Partial<PanelLayout>, { persist = true } = {}) {
  const next = { ...read(key), ...patch }
  cache.set(key, next)
  if (persist) save(key, next)
  listeners.get(key)?.forEach((notify) => notify())
}

export function togglePanelCollapsed(key: string) {
  updatePanelLayout(key, { collapsed: !read(key).collapsed })
}

/** Subscribes to one panel's layout. The snapshot is cached, so it's stable between updates. */
export function usePanelLayout(key: string): PanelLayout {
  const subscribe = useCallback(
    (notify: () => void) => {
      let set = listeners.get(key)
      if (!set) {
        set = new Set()
        listeners.set(key, set)
      }
      set.add(notify)
      return () => {
        set.delete(notify)
      }
    },
    [key],
  )
  return useSyncExternalStore(subscribe, () => read(key))
}
