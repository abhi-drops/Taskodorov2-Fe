import type { ReactNode } from 'react'
import { Modal } from './ui/Modal'
import { ReleaseNotesList } from './ReleaseNotesList'
import type { ReleaseNote } from '../types/appVersion'

/**
 * The "update available" / "update required" dialog both platforms share: a message, the
 * notes (scrolling on their own, so the action stays in view) and the platform's action —
 * an "Update" link on Android, a "Reload" button on web — passed as `children`.
 */
export function UpdateNotesModal({
  title,
  message,
  notes,
  dismissible = true,
  onClose,
  children,
}: {
  title: string
  message: string
  notes: ReleaseNote[]
  dismissible?: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Modal isOpen onClose={onClose} title={title} dismissible={dismissible}>
      <div className="flex flex-col gap-4">
        <p className="text-slate-700">{message}</p>
        {notes.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto">
            <ReleaseNotesList notes={notes} />
          </div>
        )}
        {children}
      </div>
    </Modal>
  )
}
