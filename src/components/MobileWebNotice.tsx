import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { DIALOG_OVERLAY, DIALOG_PRIMARY_BUTTON, DIALOG_SHADOW } from './ui/dialogStyles'
import { useIsPhoneWidth } from '../lib/platform/mobileLayout'
import { usePlatform } from '../lib/platform/usePlatform'
import { loadHideMobileWebNotice, saveHideMobileWebNotice } from '../lib/storage/preferences'

/**
 * Web only: a phone-sized window gets the mobile layout (see `usePlatform().isMobile`),
 * and this overlay says the Android app is the better way to use it there, since the
 * native-only parts (haptics, the back button, the share sheet) don't exist in a browser.
 * "Continue on web" (or the X, Escape, a click outside) closes it.
 *
 * Closing it only lasts until the next page load, unless "Don't show this again" is ticked:
 * that choice is stored (Preferences, i.e. localStorage on web) and silences it for good.
 * The native app never shows it.
 */
export function MobileWebNotice() {
  const { isNative } = usePlatform()
  const isPhoneWidth = useIsPhoneWidth()
  const [dismissed, setDismissed] = useState(false)
  // null until the stored choice has loaded, so a silenced notice never flashes open.
  const [hiddenForGood, setHiddenForGood] = useState<boolean | null>(null)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    if (isNative) return
    let cancelled = false
    void loadHideMobileWebNotice().then((hide) => {
      if (!cancelled) setHiddenForGood(hide)
    })
    return () => {
      cancelled = true
    }
  }, [isNative])

  const close = () => {
    if (dontShowAgain) void saveHideMobileWebNotice(true)
    setDismissed(true)
  }

  return (
    <Modal
      isOpen={!isNative && isPhoneWidth && hiddenForGood === false && !dismissed}
      onClose={close}
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 accent-accent-purple"
          />
          Don't show this again
        </label>
        <Button className={`mt-2 w-full ${DIALOG_PRIMARY_BUTTON}`} onClick={close}>
          Continue on web
        </Button>
      </div>
    </Modal>
  )
}
