import { NavLink } from 'react-router'
import { Icon } from './Icon'
import { GearIcon, GridIcon } from './NavIcons'
import homeIcon from '../../assets/home.png'

interface TopNavProps {
  className?: string
}

export function TopNav({ className = '' }: TopNavProps) {
  return (
    <div className={`inline-flex border border-neutral-300 bg-surface p-2.5 shadow-card ${className}`}>
      <nav className="inline-flex overflow-hidden">
        <NavLink
          to="/"
          end
          className="flex items-center gap-2 bg-sticky-yellow px-5 py-2 text-sm font-medium text-nav-dark"
        >
          <Icon src={homeIcon} alt="" size={18} />
          Home
        </NavLink>
        <NavLink
          to="/settings"
          className="flex items-center gap-2 bg-nav-dark px-5 py-2 text-sm font-medium text-white"
        >
          <GearIcon className="h-[18px] w-[18px] text-sticky-yellow" />
          Settings
        </NavLink>
        <NavLink
          to="/apps"
          className="flex items-center gap-2 bg-sticky-blue px-5 py-2 text-sm font-medium text-nav-dark"
        >
          <GridIcon className="h-[18px] w-[18px]" />
          Apps
        </NavLink>
      </nav>
    </div>
  )
}
