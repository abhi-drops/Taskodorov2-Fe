import { useEffect, useState } from 'react'
import { Modal } from './ui/Modal'
import { DIALOG_OVERLAY, DIALOG_SHADOW } from './ui/dialogStyles'
import { usePlatform } from '../lib/platform/usePlatform'

/** Phone-sized windows only: tablets (640px and up) get the web layout as usual. */
const PHONE_QUERY = '(max-width: 639px)'
const DISMISSED_KEY = 'taskodoro.ui.mobileWebNoticeDismissed'

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Web only: when the site is opened at a phone-sized width, an overlay suggests the
 * Taskodoro app, since the web layout (board columns, top nav) is built for wider
 * screens. Closing it (the X, Escape or a click outside) lets the user carry on, and it
 * stays closed for the rest of the browser session.
 *
 * The width check decides only whether to show this notice. It is **not** platform
 * detection: which layout renders is still `isNative` alone (see `usePlatform.ts`), and
 * the native app never shows this.
 */
export function MobileWebNotice() {
  const { isNative } = usePlatform()
  const [isPhoneWidth, setIsPhoneWidth] = useState(() => !isNative && window.matchMedia(PHONE_QUERY).matches)
  const [dismissed, setDismissed] = useState(wasDismissed)

  useEffect(() => {
    if (isNative) return
    const query = window.matchMedia(PHONE_QUERY)
    const update = () => setIsPhoneWidth(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [isNative])

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private mode or blocked storage: it just shows again on the next load.
    }
  }

  return (
    <Modal
      isOpen={!isNative && isPhoneWidth && !dismissed}
      onClose={dismiss}
      title="Use the Taskodoro app"
      variant="center"
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      <div className="flex flex-col gap-3 text-left">
        <p className="text-slate-700">
          This screen is too small for the web version. Taskodoro works best on a phone in the Taskodoro app.
        </p>
        <p className="text-sm text-slate-600">On a tablet or computer, make this window wider to use it here.</p>
      </div>
    </Modal>
  )
}
