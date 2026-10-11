import { Link, Navigate } from 'react-router'
import { AppShell } from '../components/AppShell'
import { CHIP } from '../components/SidebarPanelLayout'
import { APPS } from '../components/appsList'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { usePlatform } from '../lib/platform/usePlatform'

/**
 * `/apps`. Web has no separate landing — the Apps sidebar lives alongside each app's own
 * page, so this just forwards to the first (currently only) enabled app. Mobile gets a
 * tile list to push-navigate from, same precedent as Settings. See `docs/feat-apps.md`.
 */
export default function AppsPage() {
  const { isMobile } = usePlatform()

  if (!isMobile) {
    const firstEnabled = APPS.find((app) => !app.disabled && app.to)
    return <Navigate to={firstEnabled?.to ?? '/'} replace />
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-nav-dark">Apps</h1>
          <p className="text-slate-600">Extra tools on top of your board.</p>
        </div>
        <div className="flex flex-col gap-3">
          {APPS.map((app) => {
            const AppIcon = app.icon
            const content = (
              <span className="flex items-center gap-3 font-medium text-ink">
                {AppIcon && <AnimatedIcon icon={AppIcon} size={20} />}
                {app.label}
              </span>
            )
            return app.disabled || !app.to ? (
              <div key={app.id} aria-disabled="true" className={`${CHIP} opacity-50`}>
                {content}
              </div>
            ) : (
              <Link key={app.id} to={app.to} className={CHIP}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
