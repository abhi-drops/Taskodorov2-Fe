import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatedIcon, type AnimatedIconComponent } from './ui/AnimatedIcon'
import { SidePanel } from './ui/SidePanel'

/** Row-chip look shared by Settings' rows and the mobile Apps list. See `docs/style-guide.md`. */
export const CHIP = 'flex items-center gap-3 rounded-card border-[3px] border-ink bg-white px-4 py-3 shadow-card'
/** The destructive-action chip (Delete, Reset): the same chip shape in coral. */
export const DANGER_CHIP =
  'flex w-full items-center justify-center gap-2 rounded-card border-[3px] border-ink bg-sticky-coral px-4 py-3 font-medium text-ink dark:text-black shadow-card transition hover:opacity-90'

export interface SidebarItem {
  id: string
  label: string
  /** Omitted for disabled placeholder items. */
  to?: string
  icon?: AnimatedIconComponent
  disabled?: boolean
}

const ACTIVE_ITEM = 'rounded-card border-[3px] border-ink bg-white px-3 py-2 text-sm font-medium text-ink shadow-card'
const INACTIVE_ITEM = 'rounded-card px-3 py-2 text-sm text-body hover:text-fg'

function SidebarItemContent({ item }: { item: SidebarItem }) {
  const ItemIcon = item.icon
  return (
    <span className="flex items-center gap-2">
      {ItemIcon && <AnimatedIcon icon={ItemIcon} size={16} />}
      {item.label}
    </span>
  )
}

/**
 * Desktop-only 2-panel shell shared by Settings (`PowerToolsDesktopLayout`) and Apps
 * (`AppsDesktopLayout`): a left rail of items plus the selected item's content, each on
 * its own backdrop card — `border-edge bg-panel shadow-card`, the same "light
 * panel behind the content" treatment `GroupColumn`'s note-list backdrop and `TopNav`'s
 * pill backdrop use on the board. Mobile never renders this; see the `isMobile` branch
 * in each page.
 */
export function SidebarPanelLayout({
  items,
  activeId,
  children,
  className = 'max-w-4xl',
  sidePanel,
}: {
  items: SidebarItem[]
  activeId: string
  children: ReactNode
  className?: string
  /**
   * Opt-in: make the rail a collapsible, drag-resizable `SidePanel` whose layout is
   * remembered under `storageKey`. Apps uses it; Settings keeps its fixed rail.
   */
  sidePanel?: { storageKey: string; label: string }
}) {
  const nav = (
    <nav className={`flex shrink-0 flex-col gap-1 pt-1 ${sidePanel ? 'w-full' : 'w-44'}`}>
      {items.map((item) =>
        item.disabled || !item.to ? (
          <span key={item.id} aria-disabled="true" className={`${INACTIVE_ITEM} cursor-default opacity-50 hover:text-body`}>
            <SidebarItemContent item={item} />
          </span>
        ) : (
          <Link key={item.id} to={item.to} className={item.id === activeId ? ACTIVE_ITEM : INACTIVE_ITEM}>
            <SidebarItemContent item={item} />
          </Link>
        ),
      )}
    </nav>
  )

  // Collapsed state of the side panel: a slim strip of the items' icons, stretched to the
  // content panel's height. The active item gets the same ink-bordered chip it has in
  // the full list; disabled items are dimmed; each has a tooltip and accessible name.
  const rail = (
    <nav
      aria-label={sidePanel?.label}
      className="flex h-full flex-col items-center gap-2 border border-edge bg-panel py-3 shadow-card"
    >
      {items.map((item) => {
        const ItemIcon = item.icon
        // Items without an icon fall back to their first letter.
        const glyph = ItemIcon ? (
          <AnimatedIcon icon={ItemIcon} size={20} />
        ) : (
          <span className="font-display text-sm font-bold">{item.label[0]}</span>
        )
        const box = 'flex h-9 w-9 items-center justify-center rounded-card'
        if (item.disabled || !item.to) {
          return (
            <span
              key={item.id}
              aria-disabled="true"
              aria-label={item.label}
              title={item.label}
              className={`${box} text-body opacity-50`}
            >
              {glyph}
            </span>
          )
        }
        const active = item.id === activeId
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={`${box} ${active ? 'border-[3px] border-ink bg-white text-ink shadow-card' : 'text-body hover:text-fg'}`}
          >
            {glyph}
          </Link>
        )
      })}
    </nav>
  )

  return (
    // With a SidePanel the panel owns the gap (as a margin), so it can close the gap
    // when collapsed; no flex gap here then.
    <div className={`mx-auto flex w-full items-start ${sidePanel ? '' : 'gap-8'} ${className}`}>
      {sidePanel ? (
        <SidePanel
          side="left"
          storageKey={sidePanel.storageKey}
          label={sidePanel.label}
          defaultWidth={210}
          minWidth={160}
          maxWidth={360}
          panelClassName="border border-edge bg-panel p-4 shadow-card"
          rail={rail}
        >
          {nav}
        </SidePanel>
      ) : (
        <div className="border border-edge bg-panel p-4 shadow-card">{nav}</div>
      )}
      <div className="min-w-0 flex-1 border border-edge bg-panel p-6 shadow-card">{children}</div>
    </div>
  )
}
