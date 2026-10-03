import type { SidebarItem } from './SidebarPanelLayout'
import { BookIcon, ClockIcon } from './ui/NavIcons'

export type AppId = 'diary' | 'pomodoro'

/** `SidePanel`/`SidebarToggle` key for the desktop Apps list (width + collapsed). */
export const APPS_PANEL_KEY = 'apps'

/**
 * Every app listed under the Apps nav item — shared by the desktop sidebar
 * (`AppsDesktopLayout`) and the mobile tile list (`AppsPage`). Pomodoro is a greyed-out
 * placeholder until it's actually built.
 */
export const APPS: (SidebarItem & { id: AppId })[] = [
  { id: 'diary', label: 'Diary', to: '/apps/diary', icon: BookIcon },
  { id: 'pomodoro', label: 'Pomodoro', icon: ClockIcon, disabled: true },
]
