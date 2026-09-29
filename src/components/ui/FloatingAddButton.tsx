import { useRef } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'
import { useTiltSlide } from '../../lib/motion/useTiltSlide'
import pluseIcon from '../../assets/pluse.png'

interface FloatingAddButtonProps {
  to: string
  /** Slide up/down with the phone's tilt (see `useTiltSlide`). */
  tiltToMove?: boolean
  /** With `tiltToMove`: how far down its centre may slide, as a fraction of screen height. */
  tiltMaxFraction?: number
  className?: string
}

/**
 * Mobile quick-add: a purple half-pill tab pinned to the right screen edge, near the
 * top of the note stack (per the mobile wireframe). Replaces the old bottom-nav "+".
 */
export function FloatingAddButton({ to, tiltToMove = false, tiltMaxFraction = 3 / 6, className = '' }: FloatingAddButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  useTiltSlide(ref, tiltToMove, tiltMaxFraction)

  return (
    <Link
      ref={ref}
      to={to}
      aria-label="Add note"
      className={`fixed right-0 top-32 z-40 flex h-14 w-12 items-center justify-center rounded-l-full border-[3px] border-r-0 border-ink bg-accent-purple pl-1 shadow-card will-change-transform ${className}`}
    >
      <Icon src={pluseIcon} alt="" size={20} className="[filter:brightness(0)_invert(1)]" />
    </Link>
  )
}
