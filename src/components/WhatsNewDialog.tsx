import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { useMobileWebNoticeOpen } from '../lib/platform/mobileWebNoticeState'
import { useWhatsNew } from '../lib/whatsNew/useWhatsNew'
import { useOnboardingPending } from '../lib/onboarding/onboardingState'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { DIALOG_OVERLAY, DIALOG_PRIMARY_BUTTON, DIALOG_SHADOW } from './ui/dialogStyles'
import { ReleaseNotesList } from './ReleaseNotesList'

/**
 * Rendered from `App.tsx`; reads `WhatsNewProvider`. Closing by any route (X, Escape, the
 * backdrop, "Got it") goes through `close()`, which is when the seen version is recorded.
 *
 * Waits its turn rather than stacking: a mandatory update modal always wins, and so does
 * the web "works best in the Android app" notice, then the first-run onboarding
 * (`useOnboardingPending`: intro slides and board tour). While waiting it stays unrendered (not
 * closed), so nothing is recorded as seen. The feedback prompt waits on this one instead.
 */
export function WhatsNewDialog() {
  const { dialog, close } = useWhatsNew()
  const { result } = useAppUpdate()
  const noticeOpen = useMobileWebNoticeOpen()
  const onboardingPending = useOnboardingPending()
  const updateRequired = result?.updateAvailable === true && result.forceUpdate

  if (!dialog || updateRequired || noticeOpen || onboardingPending) return null

  return (
    <Modal
      isOpen
      onClose={close}
      title="What's new"
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      <div className="flex flex-col gap-4">
        {dialog.notes.length > 0 ? (
          <div className="max-h-[50vh] overflow-y-auto">
            <ReleaseNotesList notes={dialog.notes} />
          </div>
        ) : (
          <p className="text-sm text-slate-600">No release notes yet.</p>
        )}
        <Button className={`w-full ${DIALOG_PRIMARY_BUTTON}`} onClick={close}>
          Got it
        </Button>
      </div>
    </Modal>
  )
}
