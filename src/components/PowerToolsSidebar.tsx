import type { ReactNode } from 'react'
import { SidebarPanelLayout, type SidebarItem } from './SidebarPanelLayout'

export type PowerToolsTab = 'groups' | 'appearance' | 'account' | 'about'

const TABS: SidebarItem[] = [
  { id: 'groups', label: 'Groups', to: '/settings?tab=groups' },
  { id: 'appearance', label: 'Appearance', to: '/settings?tab=appearance' },
  { id: 'account', label: 'Account & Sync', to: '/settings?tab=account' },
  { id: 'about', label: 'About', to: '/settings?tab=about' },
]

/**
 * Desktop 2-panel shell for Settings (formerly "Power Tools" — internal names kept) —
 * rendered by both `PowerToolsPage` (`/settings`) and `GroupSettingsPage`
 * (`/settings/groups/:id`, always with `activeTab="groups"`) so it reads as one
 * app-like screen even though a group's settings is a real route/page underneath, not
 * client-only state. Tab links carry `?tab=` so they stay reachable directly from a
 * group's settings page too. See `docs/feat-power-tools.md`.
 */
export function PowerToolsDesktopLayout({ activeTab, children }: { activeTab: PowerToolsTab; children: ReactNode }) {
  return (
    <SidebarPanelLayout items={TABS} activeId={activeTab} className="max-w-6xl">
      {children}
    </SidebarPanelLayout>
  )
}
