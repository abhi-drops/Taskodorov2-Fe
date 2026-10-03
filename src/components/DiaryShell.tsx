import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AppShell } from './AppShell'
import { AppsDesktopLayout } from './AppsSidebar'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { Icon } from './ui/Icon'
import { BookIcon } from './ui/NavIcons'
import { SidebarToggle } from './ui/SidebarToggle'
import { APPS_PANEL_KEY } from './appsList'
import { usePlatform } from '../lib/platform/usePlatform'
import searchIcon from '../assets/search.png'

/**
 * Shared chrome for the Diary pages (`DiaryPage` calendar, `DiaryDayPage`).
 * - Desktop: inside the Apps 2-panel layout, with the workspace switcher and search in
 *   `AppShell`'s header slots (Diary is workspace-scoped). `wide` gives the day view's
 *   replay board the whole width.
 * - Mobile: a plain full page; navigation comes from the bottom nav and back.
 */
export function DiaryShell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  const { isNative } = usePlatform()

  if (isNative) {
    return (
      <AppShell>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">{children}</div>
      </AppShell>
    )
  }

  return (
    <AppShell
      headerStart={<WorkspaceSwitcher />}
      headerEnd={
        <Link to="/search" viewTransition aria-label="Search">
          <Icon src={searchIcon} alt="" size={20} />
        </Link>
      }
    >
      <AppsDesktopLayout activeApp="diary" wide={wide}>
        <div className="flex flex-col gap-4">{children}</div>
      </AppsDesktopLayout>
    </AppShell>
  )
}

/** `SidePanel`/`SidebarToggle` key for the day view's details sidebar (desktop). */
export const DIARY_DETAILS_PANEL_KEY = 'diary-day-details'

/**
 * The Diary toolbar: "📖 Diary" plus optional controls (scrubber, date stepper) as
 * children. On desktop it also carries the sidebar ☰ toggles at its two ends: the Apps
 * list on the far left (always), and the day-details sidebar on the far right when
 * `detailsToggle` is set. They're aligned with the toolbar, never floating, so they
 * stay put whether their sidebars are open or not.
 */
export function DiaryHeader({ detailsToggle = false, children }: { detailsToggle?: boolean; children?: ReactNode }) {
  const { isNative } = usePlatform()
  return (
    <div className="flex items-center gap-3">
      {!isNative && <SidebarToggle storageKey={APPS_PANEL_KEY} label="apps list" />}
      <div className="flex shrink-0 items-center gap-2 text-nav-dark">
        <BookIcon className="h-5 w-5" />
        <h1 className="font-display text-lg font-bold">Diary</h1>
      </div>
      {children}
      {!isNative && detailsToggle && <SidebarToggle storageKey={DIARY_DETAILS_PANEL_KEY} label="day details" />}
    </div>
  )
}

/**
 * The small Created / Moved / Changes chips in a calendar day cell, in the Diary's colour
 * scheme: violet created, blue moved, yellow changes (see `DiarySidebar`).
 * Renders nothing for a day with no activity, so a quiet month isn't a wall of zeros.
 */
export function DayActivityChips({ created, moved, changes }: { created: number; moved: number; changes: number }) {
  if (created + moved + changes === 0) return null
  // Text colour is set per chip (not here): two text-* utilities on one element have no
  // guaranteed winner in Tailwind.
  const chip = 'rounded-card border border-ink px-1 font-display text-[10px] font-bold leading-4'
  return (
    <div className="flex flex-wrap gap-0.5">
      {created > 0 && (
        <span className={`${chip} bg-accent-purple text-white`} title={`${created} created`}>
          +{created}
        </span>
      )}
      {moved > 0 && (
        <span className={`${chip} bg-sticky-blue text-ink`} title={`${moved} moved`}>
          ↔{moved}
        </span>
      )}
      {changes > 0 && (
        <span className={`${chip} bg-sticky-yellow text-ink`} title={`${changes} changes`}>
          ✎{changes}
        </span>
      )}
    </div>
  )
}
