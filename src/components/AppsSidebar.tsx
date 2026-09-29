import type { ReactNode } from 'react'
import { SidebarPanelLayout } from './SidebarPanelLayout'
import { APPS, type AppId } from './appsList'

/** Desktop 2-panel shell for Apps — same pattern as Settings. See `docs/feat-apps.md`. */
export function AppsDesktopLayout({ activeApp, children }: { activeApp: AppId; children: ReactNode }) {
  return (
    <SidebarPanelLayout items={APPS} activeId={activeApp} className="max-w-6xl">
      {children}
    </SidebarPanelLayout>
  )
}
