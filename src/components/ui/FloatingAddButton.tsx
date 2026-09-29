import { Link } from 'react-router'
import { Icon } from './Icon'
import pluseIcon from '../../assets/pluse.png'

interface FloatingAddButtonProps {
  to: string
  className?: string
}

/**
 * Mobile quick-add: a purple half-pill tab pinned to the right screen edge, near the
 * top of the note stack (per the mobile wireframe). Replaces the old bottom-nav "+".
 */
export function FloatingAddButton({ to, className = '' }: FloatingAddButtonProps) {
  return (
    <Link
      to={to}
      aria-label="Add note"
      className={`fixed right-0 top-32 z-40 flex h-14 w-12 items-center justify-center rounded-l-full border-[3px] border-r-0 border-ink bg-accent-purple pl-1 shadow-card ${className}`}
    >
      <Icon src={pluseIcon} alt="" size={20} className="[filter:brightness(0)_invert(1)]" />
    </Link>
  )
}
