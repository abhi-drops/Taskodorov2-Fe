import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { Modal } from './ui/Modal'
import { DIALOG_PRIMARY_BUTTON } from './ui/dialogStyles'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { CloseIcon, UpdateIcon } from './ui/icons'

/**
 * Rendered from `App.tsx` itself (like `SyncStrategyDialog`), not only from Settings —
 * the result of the once-per-launch auto-check (`AppUpdateProvider`) should reach the
 * user wherever they are, not only if they happen to open Settings.
 *
 * `forceUpdate: true` gets a non-dismissible `Modal` (no X, no Escape, no backdrop
 * click, back button consumed but inert) — the backend doesn't block anything itself,
 * so this is the client's own hard gate. Anything else gets a dismissible bottom pill,
 * closed for the rest of this result by `dismissBanner()` (not persisted — a fresh
 * `checkNow()` resets it, see `appUpdateContext.ts`).
 */
export function AppUpdateBanner() {
  const { result, bannerDismissed, dismissBanner } = useAppUpdate()

  if (!result || !result.updateAvailable) return null

  if (result.forceUpdate) {
    return (
      <Modal isOpen onClose={() => {}} title="Update required" dismissible={false}>
        <div className="flex flex-col gap-4">
          <p className="text-slate-700">
            Version {result.latestVersion} is required to keep using Taskodoro.
          </p>
          {result.releaseNotes && <p className="text-sm text-slate-600">{result.releaseNotes}</p>}
          <a
            href={result.downloadUrl}
            className={`flex items-center justify-center gap-2 rounded-card bg-accent-purple px-4 py-3 font-display text-sm font-bold uppercase text-white hover:opacity-90 ${DIALOG_PRIMARY_BUTTON}`}
          >
            <AnimatedIcon icon={UpdateIcon} size={18} />
            Update Now
          </a>
        </div>
      </Modal>
    )
  }

  if (bannerDismissed) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border-[3px] border-ink bg-white py-2 pl-4 pr-2 shadow-card">
        <AnimatedIcon icon={UpdateIcon} size={16} className="shrink-0 text-ink" />
        <span className="text-sm font-medium text-ink">Update available — v{result.latestVersion}</span>
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
  )
}
