import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatedIcon } from './AnimatedIcon'
import { CloseIcon } from './icons'

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
  /** `large` (centre variant only): a wide, tall panel, about 60% of the screen's width
   * and 90% of its height, for dialogs with a lot to choose from. The content area then
   * fills the panel, so a child can pin a footer with `h-full` + flex. */
  size?: 'default' | 'large'
}

export function Modal({
  isOpen,
  onClose,
  title,
  variant = 'center',
  children,
  overlayClassName,
  panelClassName,
  size = 'default',
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

  // Every modal carries the board's thick ink border (a bottom sheet on the three sides
  // that aren't the screen edge), so it reads as one of the app's chips, lifted.
  const panelShapeClasses =
    variant === 'bottom-sheet'
      ? 'w-full rounded-t-card rounded-b-none border-x-[3px] border-t-[3px] border-ink'
      : size === 'large'
        ? 'w-full md:w-[60vw] rounded-card border-[3px] border-ink'
        : 'w-full max-w-sm rounded-card border-[3px] border-ink'

  // Complete alternatives, never both: two height utilities on one element have no
  // guaranteed winner.
  const isLarge = size === 'large' && variant === 'center'
  const panelHeightClasses = isLarge ? 'h-[90vh]' : 'max-h-[85vh]'

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${overlayClassName ?? 'bg-black/40'} ${panelPositionClasses}`}
      onClick={onClose}
    >
      <div
        className={`flex ${panelHeightClasses} flex-col gap-4 bg-white p-6 ${panelClassName ?? 'shadow-lg'} ${panelShapeClasses}`}
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
            <AnimatedIcon icon={CloseIcon} size={18} className="text-ink" />
          </button>
        </div>
        <div className={isLarge ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-auto'}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
