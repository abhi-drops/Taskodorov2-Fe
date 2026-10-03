import { NavLink } from 'react-router'
import { Icon } from './Icon'
import { GearIcon, GridIcon } from './NavIcons'
import homeIcon from '../../assets/home.png'

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
        className="flex flex-1 items-center justify-center bg-sticky-yellow py-3"
      >
        <Icon src={homeIcon} alt="" size={22} />
      </NavLink>
      <NavLink
        to="/apps"
        viewTransition
        aria-label="Apps"
        className="flex flex-1 items-center justify-center bg-sticky-blue py-3 text-nav-dark"
      >
        <GridIcon className="h-[22px] w-[22px]" />
      </NavLink>
      <NavLink
        to="/settings"
        viewTransition
        aria-label="Settings"
        className="flex flex-1 items-center justify-center bg-nav-dark py-3 text-sticky-yellow"
      >
        <GearIcon className="h-[22px] w-[22px]" />
      </NavLink>
    </nav>
  )
}
