import { Button } from '../ui/Button'
import { DIALOG_PRIMARY_BUTTON } from '../ui/dialogStyles'
import { usePlatform } from '../../lib/platform/usePlatform'
import type { Tip } from '../../lib/onboarding/tips'

/**
 * The quiet milestone tip (`lib/onboarding/tips.ts`): a small paper card above the bottom
 * nav (mobile) or in the corner (web), never a modal, never blocking the board. Sits above
 * the update banners (`bottom-4` on web) and the mobile exit toast (`bottom-24`). See `docs/feat-onboarding.md`.
 */
export function NudgeTip({ tip, onAccept, onDismiss }: { tip: Tip; onAccept: () => void; onDismiss: () => void }) {
  const { isMobile } = usePlatform()
  return (
    <div
      role="status"
      className={`onboarding-rise fixed z-[60] flex flex-col gap-3 rounded-card border-[3px] border-line bg-paper p-4 shadow-pop ${
        isMobile ? 'inset-x-3 bottom-28' : 'bottom-20 right-6 w-80'
      }`}
    >
      <p className="text-sm font-medium text-fg">{tip.message}</p>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onDismiss} className="text-sm font-medium text-fg/60 hover:text-fg">
          Not now
        </button>
        <Button onClick={onAccept} className={`px-4 py-1.5 text-sm ${DIALOG_PRIMARY_BUTTON}`}>
          {tip.actionLabel}
        </Button>
      </div>
    </div>
  )
}
