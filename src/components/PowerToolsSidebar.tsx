import type { ReactNode } from 'react'
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

/**
 * Desktop-only 2-panel shell for `PowerToolsPage`/`GroupSettingsPage`: the sidebar and
 * the right-panel content each sit on their own backdrop card — `border-neutral-300
 * bg-surface shadow-card`, the same "light panel behind the content" treatment
 * `GroupColumn`'s note-list backdrop and `TopNav`'s pill backdrop use on the board (see
 * `docs/style-guide.md`) — instead of floating directly on the `.bg-grid` background
 * the way the row chips inside do. Mobile never renders this; see the `isNative`
 * branch in each page.
 */
export function PowerToolsDesktopLayout({ activeTab, children }: { activeTab: PowerToolsTab; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-start gap-8">
      <div className="border border-neutral-300 bg-surface p-4 shadow-card">
        <PowerToolsSidebar activeTab={activeTab} />
      </div>
      <div className="flex-1 border border-neutral-300 bg-surface p-6 shadow-card">{children}</div>
    </div>
  )
}
