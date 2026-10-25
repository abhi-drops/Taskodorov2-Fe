import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatedIcon } from './AnimatedIcon'
import { CloseIcon } from './icons'
import { pushBackHandler } from '../../lib/platform/backHandlers'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** `full-page` (mobile): covers the whole screen, with the close button in its top
   * corner. `overlayClassName` / `panelClassName` don't apply: nothing shows behind it. */
  variant?: 'center' | 'full-page'
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
  /** `false`: no close (X) button, no Escape, no backdrop click — only an action inside
   * `children` can get out of it. For a mandatory flow (e.g. a forced app update) where
   * the caller doesn't want any affordance to close without acting. The Android back
   * button is still consumed (so it doesn't fall through to exiting the app or
   * navigating the page underneath); it just doesn't call `onClose`. Default `true`. */
  dismissible?: boolean
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
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !dismissible) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, dismissible])

  // Android: the back button closes the modal instead of navigating the page under it.
  // Registered once per opening (the latest `onClose` is read through a ref), so a
  // re-render of a modal underneath never jumps ahead of one opened on top of it.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!isOpen) return
    // Still registered when `!dismissible`, just a no-op: this consumes the back press
    // (so it doesn't exit the app or navigate the page underneath) without closing.
    return pushBackHandler(() => {
      if (dismissible) onCloseRef.current()
    })
  }, [isOpen, dismissible])

  if (!isOpen) return null

  const isFullPage = variant === 'full-page'
  const isLarge = size === 'large' && !isFullPage

  // Every centred modal carries the board's thick ink border, so it reads as one of the
  // app's chips, lifted. A full page has no edge to draw one on.
  // Width and height are complete alternatives, never combined: two utilities for the
  // same property on one element have no guaranteed winner.
  const panelShapeClasses = isFullPage
    ? 'h-full w-full'
    : `rounded-card border-[3px] border-ink ${panelClassName ?? 'shadow-lg'} ${
        isLarge ? 'h-[90vh] w-full md:w-[60vw]' : 'max-h-[85vh] w-full max-w-sm'
      }`

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${
        isFullPage ? '' : `items-center justify-center p-6 ${overlayClassName ?? 'bg-black/40'}`
      }`}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className={`flex flex-col gap-4 bg-white p-6 ${panelShapeClasses}`}
        // Full page: keep the title and close button clear of the status bar and the
        // content clear of the gesture bar.
        style={
          isFullPage
            ? {
                paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissible) && (
          <div className="flex items-center justify-between gap-4">
            {title && <h2 className="font-display text-lg font-bold text-ink">{title}</h2>}
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
              >
                <AnimatedIcon icon={CloseIcon} size={18} className="text-ink" />
              </button>
            )}
          </div>
        )}
        <div className={isLarge || isFullPage ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-auto'}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
