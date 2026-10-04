import type { SidebarItem } from './SidebarPanelLayout'
import { DiaryIcon, PomodoroIcon, TemplatesIcon } from './ui/icons'

export type AppId = 'diary' | 'templates' | 'pomodoro'

/** `SidePanel`/`SidebarToggle` key for the desktop Apps list (width + collapsed). */
export const APPS_PANEL_KEY = 'apps'

/**
 * Every app listed under the Apps nav item — shared by the desktop sidebar
 * (`AppsDesktopLayout`) and the mobile tile list (`AppsPage`). Pomodoro is a greyed-out
 * placeholder until it's actually built.
 */
export const APPS: (SidebarItem & { id: AppId })[] = [
  { id: 'diary', label: 'Diary', to: '/apps/diary', icon: DiaryIcon },
  { id: 'templates', label: 'Templates', to: '/apps/templates', icon: TemplatesIcon },
  { id: 'pomodoro', label: 'Pomodoro', icon: PomodoroIcon, disabled: true },
]
