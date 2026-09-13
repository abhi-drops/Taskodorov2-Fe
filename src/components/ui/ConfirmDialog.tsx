import { Modal } from './Modal'
import { Button } from './Button'

/** Same frosted-white-dim + deeper-offset-shadow treatment `WorkspaceSwitcher` uses
 * for its `Modal` — a confirm dialog is asking for a deliberate, often destructive
 * decision, so it gets the same "lifts further off the page" emphasis rather than the
 * default dark `bg-black/40`/`shadow-lg`. See `docs/style-guide.md`'s `Modal.tsx` entry
 * for why these are full replacements, not additions, to the defaults. */
const OVERLAY = 'bg-white/60 backdrop-blur-sm'
const SHADOW = 'shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="center"
      overlayClassName={OVERLAY}
      panelClassName={SHADOW}
    >
      <div className="flex flex-col gap-4 text-center">
        <p className="text-slate-700">{message}</p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
