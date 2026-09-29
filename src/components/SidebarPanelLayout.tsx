import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router'

/** Row-chip look shared by Settings' rows and the mobile Apps list. See `docs/style-guide.md`. */
export const CHIP = 'flex items-center gap-3 rounded-card border-[3px] border-ink bg-white px-4 py-3 shadow-card'

export interface SidebarItem {
  id: string
  label: string
  /** Omitted for disabled placeholder items. */
  to?: string
  icon?: ComponentType<{ className?: string }>
  disabled?: boolean
}

const ACTIVE_ITEM = 'rounded-card border-[3px] border-ink bg-white px-3 py-2 text-sm font-medium text-ink shadow-card'
const INACTIVE_ITEM = 'rounded-card px-3 py-2 text-sm text-slate-600 hover:text-ink'

function SidebarItemContent({ item }: { item: SidebarItem }) {
  const ItemIcon = item.icon
  return (
    <span className="flex items-center gap-2">
      {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0" />}
      {item.label}
    </span>
  )
}

/**
 * Desktop-only 2-panel shell shared by Settings (`PowerToolsDesktopLayout`) and Apps
 * (`AppsDesktopLayout`): a left rail of items plus the selected item's content, each on
 * its own backdrop card — `border-neutral-300 bg-surface shadow-card`, the same "light
 * panel behind the content" treatment `GroupColumn`'s note-list backdrop and `TopNav`'s
 * pill backdrop use on the board. Mobile never renders this; see the `isNative` branch
 * in each page.
 */
export function SidebarPanelLayout({
  items,
  activeId,
  children,
  className = 'max-w-4xl',
}: {
  items: SidebarItem[]
  activeId: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto flex w-full items-start gap-8 ${className}`}>
      <div className="border border-neutral-300 bg-surface p-4 shadow-card">
        <nav className="flex w-44 shrink-0 flex-col gap-1 pt-1">
          {items.map((item) =>
            item.disabled || !item.to ? (
              <span key={item.id} aria-disabled="true" className={`${INACTIVE_ITEM} cursor-default opacity-50 hover:text-slate-600`}>
                <SidebarItemContent item={item} />
              </span>
            ) : (
              <Link key={item.id} to={item.to} className={item.id === activeId ? ACTIVE_ITEM : INACTIVE_ITEM}>
                <SidebarItemContent item={item} />
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="min-w-0 flex-1 border border-neutral-300 bg-surface p-6 shadow-card">{children}</div>
    </div>
  )
}
