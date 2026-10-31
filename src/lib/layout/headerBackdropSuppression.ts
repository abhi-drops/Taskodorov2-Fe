import { createContext, useContext, useEffect } from 'react'

/**
 * Shared "how many things currently want the header/tab-strip tape backdrop
 * suppressed" counter — provided by `AppShell` (the only place that owns the state),
 * consumed by `useSuppressHeaderBackdrop` (report) and `useIsHeaderBackdropSuppressed`
 * (read). A counter rather than a single boolean so two overlay-ish things being open
 * at once (unlikely today, but cheap to get right) composes correctly instead of one
 * closing and clobbering the other's suppression.
 */
export const HeaderBackdropSuppressionContext = createContext<{
  count: number
  adjust: (delta: 1 | -1) => void
} | null>(null)

/**
 * Call from anything that already fully dims/covers the screen on its own (e.g.
 * `WorkspaceSwitcher`'s dropdown overlay) with `active` set to whether it's currently
 * open — suppresses `AppShell`'s scrolled-header tape backdrop (and the mobile sticky
 * group-tab strip's) for as long as `active` is true. Without this, two translucent
 * layers — the header's own wash/grain/sheen *and* the overlay's dim — stack directly
 * on top of each other wherever they overlap, compounding into a far more washed-out/
 * blown-out look than either intends alone; the overlay's own blur/dim should look
 * exactly like it did before the header grew one.
 */
export function useSuppressHeaderBackdrop(active: boolean) {
  const ctx = useContext(HeaderBackdropSuppressionContext)
  useEffect(() => {
    if (!active || !ctx) return
    ctx.adjust(1)
    return () => ctx.adjust(-1)
  }, [active, ctx])
}

/** Whether something is currently suppressing the header/tab-strip tape backdrop —
 * read by `AppShell` and `HomePage`'s `StickyGroupTabs` to decide whether their own
 * backdrop should be allowed to show even though the page is scrolled. */
export function useIsHeaderBackdropSuppressed(): boolean {
  return (useContext(HeaderBackdropSuppressionContext)?.count ?? 0) > 0
}
