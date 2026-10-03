import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Sizes an element to fill exactly the rest of the screen: whatever height is left
 * after the page chrome **above** it (measured from its top) and **below** it (measured
 * as the document's extra length past its bottom edge: card padding, borders, page
 * padding). So the page itself never scrolls, and no rem offsets are hard-coded that
 * would go stale whenever the chrome changes. (A `calc(100svh − 13rem)` guess did, and
 * gave the Diary day page a whole-page scrollbar.)
 *
 * Changing the element's own height doesn't change the chrome around it, so a
 * re-measure after applying the height lands on the same value: stable, no feedback
 * loop. Re-measures on window resize and whenever the page's layout changes size
 * (`ResizeObserver` on `<body>`), coalesced to one measurement per frame.
 *
 * Returns a ref for the element, and its height in px (`null` before the first
 * measurement). Apply the height to that same element.
 */
export function useFillViewportHeight<T extends HTMLElement>(minHeight = 240) {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const below = document.documentElement.scrollHeight - (top + rect.height)
      const next = Math.max(minHeight, Math.floor(window.innerHeight - top - below))
      setHeight((current) => (current === next ? current : next))
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    schedule()
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [minHeight])

  return [ref, height] as const
}
