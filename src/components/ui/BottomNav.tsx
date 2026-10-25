import { NavLink } from 'react-router'
import { AnimatedIcon } from './AnimatedIcon'
import { AppsIcon, HomeIcon, SettingsIcon } from './icons'

/**
 * Mobile bottom bar: Home / Apps / Settings, icon-only per the mobile wireframe. The
 * quick-add "+" that used to sit here now lives on the board as `FloatingAddButton`.
 *
 * Tabs navigate with `viewTransition` (a directional slide; see
 * `lib/motion/pageTransitions.ts`). The bar has its own `view-transition-name`, so it
 * stays put while pages slide underneath it.
 */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', viewTransitionName: 'bottom-nav' }}
    >
      <NavLink
        to="/"
        end
        viewTransition
        aria-label="Home"
        className="flex flex-1 items-center justify-center bg-sticky-yellow py-3 text-ink"
      >
        <AnimatedIcon icon={HomeIcon} size={22} />
      </NavLink>
      <NavLink
        to="/apps"
        viewTransition
        aria-label="Apps"
        className="flex flex-1 items-center justify-center bg-sticky-blue py-3 text-ink"
      >
        <AnimatedIcon icon={AppsIcon} size={22} />
      </NavLink>
      <NavLink
        to="/settings"
        viewTransition
        aria-label="Settings"
        className="flex flex-1 items-center justify-center bg-ink py-3 text-sticky-yellow"
      >
        <AnimatedIcon icon={SettingsIcon} size={22} />
      </NavLink>
    </nav>
  )
}
