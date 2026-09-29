import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { AppsDesktopLayout } from '../components/AppsSidebar'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { Icon } from '../components/ui/Icon'
import { BookIcon } from '../components/ui/NavIcons'
import { usePlatform } from '../lib/platform/usePlatform'
import searchIcon from '../assets/search.png'

/**
 * `/apps/diary`. Placeholder shell for Phase 2.8 — the calendar/scrubber described in
 * `docs/phase2-apps-diary-plan.md` replaces the body below.
 */
export default function DiaryPage() {
  const { isNative } = usePlatform()

  const header = (
    <div className="flex items-center gap-2 text-nav-dark">
      <BookIcon className="h-5 w-5" />
      <h1 className="font-display text-lg font-bold">Diary</h1>
    </div>
  )
  const placeholder = (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-neutral-300 bg-white px-6 py-16 text-center">
      <p className="font-medium text-ink">Diary is coming soon.</p>
      <p className="text-sm text-slate-600">A day-by-day timeline of what happened on your board.</p>
    </div>
  )

  if (isNative) {
    return (
      <AppShell>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6">
          {header}
          {placeholder}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      headerStart={<WorkspaceSwitcher />}
      headerEnd={
        <Link to="/search" aria-label="Search">
          <Icon src={searchIcon} alt="" size={20} />
        </Link>
      }
    >
      <AppsDesktopLayout activeApp="diary">
        <div className="flex flex-col gap-4">
          {header}
          {placeholder}
        </div>
      </AppsDesktopLayout>
    </AppShell>
  )
}
