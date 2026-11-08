import { useState } from 'react'
import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { getUpdateNotes } from '../lib/appUpdate/updateNotes'
import { isNative } from '../lib/platform/isNative'
import { UpdateNotesModal } from './UpdateNotesModal'
import { DIALOG_PRIMARY_BUTTON } from './ui/dialogStyles'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { CloseIcon, UpdateIcon } from './ui/icons'

const UPDATE_LINK = `flex items-center justify-center gap-2 rounded-card bg-accent-purple px-4 py-3 font-display text-sm font-bold uppercase text-white hover:opacity-90 ${DIALOG_PRIMARY_BUTTON}`

/**
 * Android's update alert; the web equivalent is `WebUpdateBanner`. Rendered from
 * `App.tsx` itself (like `SyncStrategyDialog`), not only from Settings — the result of the
 * once-per-launch auto-check (`AppUpdateProvider`) should reach the user wherever they are.
 *
 * `forceUpdate: true` gets a non-dismissible `Modal` (no X, no Escape, no backdrop
 * click, back button consumed but inert) — the backend doesn't block anything itself,
 * so this is the client's own hard gate. Anything else gets a dismissible bottom pill,
 * closed for the rest of this result by `dismissBanner()` (not persisted — a fresh
 * `checkNow()` resets it, see `appUpdateContext.ts`). Tapping the pill's label opens the
 * same dialog with the release notes.
 */
export function AppUpdateBanner() {
  const { result, bannerDismissed, dismissBanner } = useAppUpdate()
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!isNative() || !result || !result.updateAvailable) return null

  const notes = getUpdateNotes(result)
  const updateLink = (
    <a href={result.downloadUrl} className={UPDATE_LINK}>
      <AnimatedIcon icon={UpdateIcon} size={18} />
      Update Now
    </a>
  )

  if (result.forceUpdate) {
    return (
      <UpdateNotesModal
        title="Update required"
        message={`Version ${result.latestVersion} is required to keep using Taskodoro.`}
        notes={notes}
        dismissible={false}
        onClose={() => {}}
      >
        {updateLink}
      </UpdateNotesModal>
    )
  }

  if (bannerDismissed) return null

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border-[3px] border-ink bg-white py-2 pl-4 pr-2 shadow-card">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <AnimatedIcon icon={UpdateIcon} size={16} className="shrink-0 text-ink" />
            <span className="text-sm font-medium text-ink">Update available — v{result.latestVersion}</span>
          </button>
          <a
            href={result.downloadUrl}
            className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-bold uppercase text-white hover:opacity-90"
          >
            Update
          </a>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <AnimatedIcon icon={CloseIcon} size={14} className="text-ink" />
          </button>
        </div>
      </div>
      {detailsOpen && (
        <UpdateNotesModal
          title="Update available"
          message={`Version ${result.latestVersion} is ready to install.`}
          notes={notes}
          onClose={() => setDetailsOpen(false)}
        >
          {updateLink}
        </UpdateNotesModal>
      )}
    </>
  )
}
