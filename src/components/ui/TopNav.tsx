import { NavLink } from 'react-router'
import { AnimatedIcon } from './AnimatedIcon'
import { AppsIcon, HomeIcon, SettingsIcon } from './icons'

interface TopNavProps {
  className?: string
}

/**
 * Web top nav. Links navigate with `viewTransition` (a quick fade-rise; see
 * `lib/motion/pageTransitions.ts`), and the pill has its own `view-transition-name` so
 * it stays still while the page content changes around it.
 */
export function TopNav({ className = '' }: TopNavProps) {
  return (
    <div
      className={`inline-flex border border-neutral-300 bg-surface p-2.5 shadow-card ${className}`}
      style={{ viewTransitionName: 'top-nav' }}
    >
      <nav className="inline-flex overflow-hidden">
        <NavLink
          to="/"
          end
          viewTransition
          className="flex items-center gap-2 bg-sticky-yellow px-5 py-2 text-sm font-medium text-nav-dark"
        >
          <AnimatedIcon icon={HomeIcon} size={18} />
          Home
        </NavLink>
        <NavLink
          to="/settings"
          viewTransition
          className="flex items-center gap-2 bg-nav-dark px-5 py-2 text-sm font-medium text-white"
        >
          <AnimatedIcon icon={SettingsIcon} size={18} className="text-sticky-yellow" />
          Settings
        </NavLink>
        <NavLink
          to="/apps"
          viewTransition
          className="flex items-center gap-2 bg-sticky-blue px-5 py-2 text-sm font-medium text-nav-dark"
        >
          <AnimatedIcon icon={AppsIcon} size={18} />
          Apps
        </NavLink>
      </nav>
    </div>
  )
}
