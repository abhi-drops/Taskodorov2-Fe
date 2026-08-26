import { NavLink } from 'react-router'
import { Icon } from './Icon'
import homeIcon from '../../assets/home.png'
import pluseIcon from '../../assets/pluse.png'
import powerToolsIcon from '../../assets/power-tools.png'

interface BottomNavProps {
  showAddButton?: boolean
}

export function BottomNav({ showAddButton = true }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <NavLink
        to="/"
        end
        className="flex flex-1 items-center justify-center gap-2 bg-sticky-yellow py-3 text-sm font-medium text-nav-dark"
      >
        <Icon src={homeIcon} alt="" size={20} />
        Home
      </NavLink>
      {showAddButton && (
        <NavLink
          to="/notes/new"
          className="flex w-16 items-center justify-center bg-accent-purple py-3"
        >
          <Icon src={pluseIcon} alt="Add note" size={20} className="[filter:brightness(0)_invert(1)]" />
        </NavLink>
      )}
      <NavLink
        to="/power-tools"
        className="flex flex-1 items-center justify-center gap-2 bg-nav-dark py-3 text-sm font-medium text-white"
      >
        <Icon src={powerToolsIcon} alt="" size={20} />
        Power Tools
      </NavLink>
    </nav>
  )
}
