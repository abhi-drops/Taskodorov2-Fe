import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AppShell } from './AppShell'
import { AppsDesktopLayout } from './AppsSidebar'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { Icon } from './ui/Icon'
import { SidebarToggle } from './ui/SidebarToggle'
import { APPS_PANEL_KEY } from './appsList'
import { usePlatform } from '../lib/platform/usePlatform'
import searchIcon from '../assets/search.png'

/**
 * Shared chrome for the Templates pages (`TemplatesPage` list, `TemplateEditorPage`),
 * the same shape as `DiaryShell`.
 * - Desktop: inside the Apps 2-panel layout, with the workspace switcher and search in
 *   `AppShell`'s header slots. `wide` gives the editor's board the whole width.
 * - Mobile: a plain full page; navigation comes from the bottom nav and back.
 */
export function TemplatesShell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
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
        <Link to="/search" viewTransition aria-label="Search" className="group">
          <Icon src={searchIcon} alt="" size={20} className="transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none" />
        </Link>
      }
    >
      <AppsDesktopLayout activeApp="templates" wide={wide}>
        <div className="flex flex-col gap-4">{children}</div>
      </AppsDesktopLayout>
    </AppShell>
  )
}

/** A labelled square toolbar control, the same shape as `SidebarToggle` beside it. */
export const TOOLBAR_BUTTON =
  'flex h-7 shrink-0 items-center gap-1.5 rounded-card border-2 border-ink px-2 text-sm font-medium text-ink shadow-card transition-colors disabled:opacity-50'

/**
 * The Templates toolbar: on desktop the Apps list toggle sits at the far left (as in the
 * Diary), then whatever the page puts in it (title, actions).
 */
export function TemplatesToolbar({ children }: { children: ReactNode }) {
  const { isNative } = usePlatform()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!isNative && <SidebarToggle storageKey={APPS_PANEL_KEY} label="apps list" />}
      {children}
    </div>
  )
}
