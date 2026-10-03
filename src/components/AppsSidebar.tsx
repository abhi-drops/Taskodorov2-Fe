import type { ReactNode } from 'react'
import { SidebarPanelLayout } from './SidebarPanelLayout'
import { APPS, APPS_PANEL_KEY, type AppId } from './appsList'

/**
 * Desktop 2-panel shell for Apps — same pattern as Settings. See `docs/feat-apps.md`.
 * `wide` drops the max width for apps whose content needs the whole screen (the
 * Diary's day replay board).
 */
export function AppsDesktopLayout({
  activeApp,
  wide = false,
  children,
}: {
  activeApp: AppId
  wide?: boolean
  children: ReactNode
}) {
  return (
    <SidebarPanelLayout
      items={APPS}
      activeId={activeApp}
      className={wide ? 'max-w-none' : 'max-w-6xl'}
      sidePanel={{ storageKey: APPS_PANEL_KEY, label: 'Apps' }}
    >
      {children}
    </SidebarPanelLayout>
  )
}
