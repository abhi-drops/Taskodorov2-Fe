import { useId, useRef } from 'react'
import { Link } from 'react-router'
import { useTiltSlide } from '../../lib/motion/useTiltSlide'
/**
 * The bell-curve bump from the mobile Penpot export (`newdesktoplayloutMobile.html`),
 * translated to the origin: flat tails hugging the screen edge at x≈34 top and bottom,
 * bulging out to x=0 at the vertical middle. The final `L44,51 L34.07,0` closes the shape
 * *outside* the viewBox (exactly like the export), so the inner stroke never draws a
 * line down the screen edge.
 */
const BUMP_PATH =
  'M34.07,0C34.07,0 33.48,2.12 25.55,10C17.17,18.33 0,32.88 0,50C0,67.19 17.14,78.67 25.55,87C33.45,94.82 34.07,100 34.07,100L44,51L34.07,0Z'

interface FloatingAddButtonProps {
  to: string
  /** Slide up/down with the phone's tilt (see `useTiltSlide`). */
  tiltToMove?: boolean
  /** With `tiltToMove`: how far down its centre may slide, as a fraction of screen height. */
  tiltMaxFraction?: number
  className?: string
}

/**
 * Mobile quick-add: a purple bell-curve bump pinned to the right screen edge, near the
 * top of the note stack (per the mobile wireframe). Replaces the old bottom-nav "+".
 */
export function FloatingAddButton({ to, tiltToMove = false, tiltMaxFraction = 3 / 6, className = '' }: FloatingAddButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  // useId() output contains ':'/'«»', which can break `url(#…)` in some WebViews.
  const clipId = `fab-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  useTiltSlide(ref, tiltToMove, tiltMaxFraction)

  return (
    <Link
      ref={ref}
      to={to}
      aria-label="Add note"
      data-haptic="medium"
      className={`fixed right-0 top-32 z-40 block h-[100px] w-[34px] [filter:drop-shadow(1px_3px_0_rgba(0,0,0,0.2))] ${className}`}
    >
      <svg viewBox="0 0 34.07 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={BUMP_PATH} />
          </clipPath>
        </defs>
        <path d={BUMP_PATH} className="fill-accent-purple" />
        {/* Inner stroke, as in the export: 10 wide, clipped to the shape → 5px visible. */}
        <path d={BUMP_PATH} fill="none" strokeWidth={10} clipPath={`url(#${clipId})`} className="stroke-ink" />
      </svg>
      <span className="absolute left-[14px] top-1/2 -translate-y-1/2 font-display text-[25px] font-bold leading-none text-white">
        +
      </span>
    </Link>
  )
}
