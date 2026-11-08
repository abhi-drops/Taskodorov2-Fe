import { useState } from 'react'
import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { getUpdateNotes } from '../lib/appUpdate/updateNotes'
import { isNative } from '../lib/platform/isNative'
import { usePlatform } from '../lib/platform/usePlatform'
import { UpdateNotesModal } from './UpdateNotesModal'
import { DIALOG_PRIMARY_BUTTON } from './ui/dialogStyles'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { CloseIcon, UpdateIcon } from './ui/icons'

const RELOAD_BUTTON = `flex items-center justify-center gap-2 rounded-card bg-accent-purple px-4 py-3 font-display text-sm font-bold uppercase text-white hover:opacity-90 ${DIALOG_PRIMARY_BUTTON}`

function reload() {
  window.location.reload()
}

/**
 * Web only: a newer web build was deployed while this tab was open. Slim banner with
 * "Reload" and the notes behind "What's new". Never reloads by itself — the app writes to
 * local SQLite, and an unprompted reload could land in the middle of a save (see
 * `docs/feat-offline-data-layer.md`). `downloadUrl` is ignored here: on web the fix is
 * the reload. A `forceUpdate` row (not expected for web) becomes the non-dismissible modal.
 */
export function WebUpdateBanner() {
  const { isMobile } = usePlatform()
  const { result, bannerDismissed, dismissBanner } = useAppUpdate()
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (isNative() || !result || !result.updateAvailable) return null

  const notes = getUpdateNotes(result)
  const reloadButton = (
    <button type="button" onClick={reload} className={RELOAD_BUTTON}>
      <AnimatedIcon icon={UpdateIcon} size={18} />
      Reload
    </button>
  )

  if (result.forceUpdate) {
    return (
      <UpdateNotesModal
        title="Update required"
        message="A new version of Taskodoro is required to keep using it. Reload to get it."
        notes={notes}
        dismissible={false}
        onClose={() => {}}
      >
        {reloadButton}
      </UpdateNotesModal>
    )
  }

  if (bannerDismissed) return null

  return (
    <>
      {/* Clear of the bottom nav on a phone-sized window. */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${isMobile ? 'bottom-24' : 'bottom-4'}`}
      >
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-card border-[3px] border-ink bg-white py-2 pl-4 pr-2 shadow-card">
          <span className="text-sm font-medium text-ink">A new version of Taskodoro is available</span>
          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="shrink-0 text-sm font-medium text-ink underline"
            >
              What's new
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-bold uppercase text-white hover:opacity-90"
          >
            Reload
          </button>
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
          title="What's new"
          message="Reload to switch to the new version."
          notes={notes}
          onClose={() => setDetailsOpen(false)}
        >
          {reloadButton}
        </UpdateNotesModal>
      )}
    </>
  )
}
