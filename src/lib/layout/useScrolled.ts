import { useEffect, useState } from 'react'

/**
 * True once the window has scrolled past `threshold` — for toggling a sticky header's
 * backdrop on/off. Coalesced to one check per frame via `requestAnimationFrame`, same
 * pattern as `useFillViewportHeight`, so a fast scroll doesn't flood re-renders.
 */
export function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold)

  useEffect(() => {
    let frame = 0
    const check = () => setScrolled(window.scrollY > threshold)
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(check)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
    }
  }, [threshold])

  return scrolled
}
