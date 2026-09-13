import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import pluseIcon from '../../assets/pluse.png'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  variant?: 'center' | 'bottom-sheet'
  children: ReactNode
  /** Full replacement for the default `bg-black/40` overlay — not appended alongside
   * it, since two conflicting Tailwind background utilities in one class list have no
   * guaranteed winner (same specificity; source order is the generated stylesheet's,
   * not the JSX class string's). Pass a complete class string, e.g. for a lighter/
   * blurred look on a specific consumer, not a default-preserving addition. */
  overlayClassName?: string
  /** Same full-replacement rule as `overlayClassName`, for the default `shadow-lg` on
   * the panel itself (e.g. a deeper custom offset shadow for one consumer). */
  panelClassName?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  variant = 'center',
  children,
  overlayClassName,
  panelClassName,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelPositionClasses =
    variant === 'bottom-sheet'
      ? 'items-end justify-center'
      : 'items-center justify-center p-6'

  const panelShapeClasses =
    variant === 'bottom-sheet'
      ? 'w-full rounded-t-card rounded-b-none'
      : 'w-full max-w-sm rounded-card'

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${overlayClassName ?? 'bg-black/40'} ${panelPositionClasses}`}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] flex-col gap-4 bg-white p-6 ${panelClassName ?? 'shadow-lg'} ${panelShapeClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          {title && <h2 className="font-display text-lg text-nav-dark">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <Icon src={pluseIcon} alt="" size={14} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
