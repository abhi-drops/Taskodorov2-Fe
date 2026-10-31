import { useEffect, useRef, type RefObject } from 'react'

function stripIds(el: Element) {
  el.removeAttribute('id')
  for (const child of el.children) stripIds(child)
}

/**
 * A manually blurred "peek" of whatever's really behind a sticky/fixed bar — real
 * `backdrop-filter` doesn't render at all in some real test environments (GPU/WebView
 * dependent, confirmed by testing), so this fakes the same effect with a technique
 * that only needs the far more widely supported `filter: blur()`: clone the live
 * scrollable content's DOM once (`cloneNode`, not a React re-render — re-mounting the
 * real tree would re-run every page's hooks/effects a second time, unsafe for anything
 * with real side effects like drag-and-drop or DB subscriptions), strip every `id`
 * recursively so the clone can never shadow the real element for
 * `getElementById`/`for=`/etc., and translate it in lockstep with the page's actual
 * scroll position so the clipped, blurred window shows the same content that's really
 * behind the bar. Only re-clones when `active` flips true (not continuously) — blurred
 * this heavily, staleness between re-clones is imperceptible, so there's no need to pay
 * for a live-syncing clone.
 *
 * `contentOffsetTop` is the document-Y coordinate where `sourceRef`'s own natural
 * (unstuck) top sits — e.g. a fixed header's own height when a spacer pushes content
 * to start right after it, or a measured `getBoundingClientRect().top + scrollY` for a
 * sticky bar sitting further down the page. The peek's clone is translated by
 * `contentOffsetTop - scrollY`, which is `0` (no shift) right as the bar becomes stuck
 * and increasingly negative (scrolling the clone's content upward) as the page scrolls
 * further — exactly matching what's visible behind the real bar at any scroll position.
 */
export function useBlurredPeek(sourceRef: RefObject<HTMLElement | null>, contentOffsetTop: number, active: boolean) {
  const peekRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const peekEl = peekRef.current
    if (!active || !sourceRef.current || !peekEl) return
    const clone = sourceRef.current.cloneNode(true) as HTMLElement
    stripIds(clone)
    clone.style.transformOrigin = 'top center'
    peekEl.replaceChildren(clone)
    return () => {
      peekEl.replaceChildren()
    }
  }, [active, sourceRef])

  useEffect(() => {
    if (!active) return
    let frame = 0
    const sync = () => {
      const clone = peekRef.current?.firstElementChild as HTMLElement | undefined
      if (clone) clone.style.transform = `translateY(${contentOffsetTop - window.scrollY}px) scale(1.1)`
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sync)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
    }
  }, [active, contentOffsetTop])

  return peekRef
}
