import { Link } from 'react-router'

export type PowerToolsTab = 'groups' | 'addons' | 'account'

const TABS: { id: PowerToolsTab; label: string }[] = [
  { id: 'groups', label: 'Groups' },
  { id: 'addons', label: 'Addons' },
  { id: 'account', label: 'Account & Sync' },
]

/**
 * The persistent left panel of the desktop Power Tools 2-panel layout — rendered by
 * both `PowerToolsPage` (`/power-tools`) and `GroupSettingsPage`
 * (`/power-tools/groups/:id`, always with `activeTab="groups"`) so it reads as one
 * app-like screen even though a group's settings is a real route/page underneath, not
 * client-only state. Tab links carry `?tab=` so this stays reachable directly from a
 * group's settings page too, not just from the groups list. See `docs/feat-power-tools.md`.
 */
export function PowerToolsSidebar({ activeTab }: { activeTab: PowerToolsTab }) {
  return (
    <nav className="flex w-44 shrink-0 flex-col gap-1 pt-1">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          to={`/power-tools?tab=${tab.id}`}
          className={
            tab.id === activeTab
              ? 'rounded-card border-[3px] border-ink bg-white px-3 py-2 text-sm font-medium text-ink shadow-card'
              : 'rounded-card px-3 py-2 text-sm text-slate-600 hover:text-ink'
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
