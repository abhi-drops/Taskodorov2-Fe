import { useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { DIALOG_OVERLAY, DIALOG_PRIMARY_BUTTON, DIALOG_SHADOW } from './ui/dialogStyles'
import { useIsPhoneWidth } from '../lib/platform/mobileLayout'
import { usePlatform } from '../lib/platform/usePlatform'

/**
 * Web only: a phone-sized window gets the mobile layout (see `usePlatform().isMobile`),
 * and this overlay says the Android app is the better way to use it there, since the
 * native-only parts (haptics, the back button, the share sheet) don't exist in a browser.
 * "Continue on web" (or the X, Escape, a click outside) closes it.
 *
 * The dismissal is deliberately not stored: the notice returns on every page load. The
 * native app never shows it.
 */
export function MobileWebNotice() {
  const { isNative } = usePlatform()
  const isPhoneWidth = useIsPhoneWidth()
  const [dismissed, setDismissed] = useState(false)

  return (
    <Modal
      isOpen={!isNative && isPhoneWidth && !dismissed}
      onClose={() => setDismissed(true)}
      title="Taskodoro works best in the Android app"
      variant="center"
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      <div className="flex flex-col gap-3 text-left">
        <p className="text-slate-700">
          You're using the web version on a small screen. Some features may not work well here.
        </p>
        <p className="text-sm text-slate-600">For the full experience, download the Taskodoro Android app.</p>
        <Button className={`mt-2 w-full ${DIALOG_PRIMARY_BUTTON}`} onClick={() => setDismissed(true)}>
          Continue on web
        </Button>
      </div>
    </Modal>
  )
}
