import { useEffect, useRef, type RefObject } from 'react'

function stripIds(el: Element) {
  el.removeAttribute('id')
  for (const child of el.children) stripIds(child)
}

function isScrollable(el: Element) {
  const { overflowX, overflowY } = getComputedStyle(el)
  return /auto|scroll/.test(overflowX + overflowY) && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
}

/**
 * Walks the real tree and its fresh clone in parallel (identical structure right after
 * `cloneNode`) and pairs every inner scroll container — e.g. the board's horizontal
 * `overflow-x-auto` column strip — with its clone, copying its current scroll offset
 * over. `cloneNode` never preserves `scrollLeft`/`scrollTop`, and the window-scroll
 * translate below only follows the page itself, never these inner scrollers.
 */
function pairScrollers(real: Element, clone: Element, pairs: Map<Element, HTMLElement>) {
  if (isScrollable(real)) {
    const c = clone as HTMLElement
    c.scrollLeft = real.scrollLeft
    c.scrollTop = real.scrollTop
    pairs.set(real, c)
  }
  for (let i = 0; i < real.children.length; i++) {
    const rc = real.children[i]
    const cc = clone.children[i]
    if (rc && cc) pairScrollers(rc, cc, pairs)
  }
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
 * for a live-syncing clone. Inner scroll containers (e.g. the board's horizontal
 * column strip) are paired with their clones and mirrored on every `scroll` event, since
 * the window-scroll translate doesn't cover them.
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
    const source = sourceRef.current
    if (!active || !source || !peekEl) return
    const clone = source.cloneNode(true) as HTMLElement
    stripIds(clone)
    clone.style.transformOrigin = 'top center'
    peekEl.replaceChildren(clone)

    // Keep inner scrollers (the board's horizontal column strip) in step with the real
    // ones. `scroll` doesn't bubble, so listen in the capture phase on the document.
    const pairs = new Map<Element, HTMLElement>()
    pairScrollers(source, clone, pairs)
    const onScroll = (e: Event) => {
      const mirror = e.target instanceof Element ? pairs.get(e.target) : undefined
      if (mirror && e.target instanceof Element) {
        mirror.scrollLeft = e.target.scrollLeft
        mirror.scrollTop = e.target.scrollTop
      }
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
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
