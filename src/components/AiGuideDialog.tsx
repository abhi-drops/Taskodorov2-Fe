import type { ReactNode } from 'react'
import { Modal } from './ui/Modal'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { FormError } from './ui/FormError'
import { ChatGptIcon, ClaudeIcon, ExportIcon, GeminiIcon, ImportIcon } from './ui/icons'
import { DIALOG_OVERLAY, DIALOG_SHADOW } from './ui/dialogStyles'
import { CHIP } from './SidebarPanelLayout'
import { usePlatform } from '../lib/platform/usePlatform'

interface AiGuideDialogProps {
  onClose: () => void
  onDownload: () => void
  onImport: () => void
  /** What the last step's button says, e.g. "Import template". */
  importLabel: string
  /** What importing does here, in a sentence. */
  importDescription: ReactNode
  /** Disables the import button while its result is being saved. */
  busy?: boolean
  error: string | null
}

/**
 * "Generate with AI": the four steps for having an AI assistant write a template, with
 * the AI Guide download and the import that finishes the job. Shared by the Templates
 * list (import adds a template) and the New workspace dialog (import also creates the
 * workspace). Render it only while it should be open (it has no `isOpen` prop).
 */
export function AiGuideDialog({
  onClose,
  onDownload,
  onImport,
  importLabel,
  importDescription,
  busy = false,
  error,
}: AiGuideDialogProps) {
  const { isMobile } = usePlatform()
  const step =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-card border-2 border-ink bg-sticky-yellow font-display text-sm font-bold text-ink'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Generate with AI"
      variant={isMobile ? 'full-page' : 'center'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {/* p-1: room for the chips' offset shadows inside Modal's scroll box. */}
      <div className="flex flex-col gap-5 p-1 text-left">
        <div className="flex items-center gap-3 text-ink">
          <AnimatedIcon icon={ChatGptIcon} size={24} still />
          <AnimatedIcon icon={ClaudeIcon} size={24} still />
          <AnimatedIcon icon={GeminiIcon} size={24} still />
          <span className="text-sm text-slate-600">ChatGPT, Claude, Gemini or any other AI assistant</span>
        </div>

        <ol className="flex flex-col gap-4">
          <li className="flex gap-3">
            <span className={step}>1</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm text-ink">
                Download the AI Guide. It teaches an assistant how to write a board for Taskodoro.
              </p>
              <button type="button" onClick={onDownload} className={`${CHIP} font-medium text-ink hover:bg-slate-50`}>
                <AnimatedIcon icon={ExportIcon} size={20} />
                Download AI Guide
              </button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className={step}>2</span>
            <p className="min-w-0 flex-1 text-sm text-ink">
              Give the guide to your assistant (attach the file or paste its text) and describe the board you want,
              for example "a board for planning a wedding". To change a template you already have, export it and
              give the assistant that file too.
            </p>
          </li>
          <li className="flex gap-3">
            <span className={step}>3</span>
            <p className="min-w-0 flex-1 text-sm text-ink">
              Answer its questions, then download the file it gives you (its name ends in{' '}
              <span className="font-bold">.json</span>).
            </p>
          </li>
          <li className="flex gap-3">
            <span className={step}>4</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm text-ink">{importDescription}</p>
              <button
                type="button"
                onClick={onImport}
                disabled={busy}
                className={`${CHIP} bg-sticky-yellow font-medium text-ink hover:opacity-90 disabled:opacity-50`}
              >
                <AnimatedIcon icon={ImportIcon} size={20} />
                {importLabel}
              </button>
            </div>
          </li>
        </ol>

        <FormError message={error} />
      </div>
    </Modal>
  )
}
