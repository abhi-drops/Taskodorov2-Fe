import { createContext } from 'react'
import type { ReleaseNote } from '../../types/appVersion'

export interface WhatsNewDialogState {
  notes: ReleaseNote[]
  /** The `versionCode` to record as seen when the dialog closes — set for the automatic
   * after-update dialog, `null` for one opened from Settings (which records nothing). */
  seenVersionCode: number | null
}

export interface WhatsNewContextValue {
  /** What the dialog should show; `null` while it's closed. */
  dialog: WhatsNewDialogState | null
  /** True while the launch check is in flight or a dialog is open — the feedback prompt
   * waits on this so the two never stack. */
  pending: boolean
  /** Status of the Settings "What's new" fetch. */
  browseStatus: 'idle' | 'loading' | 'error'
  /** Settings: open the dialog with the latest releases up to this build. */
  openLatest(): Promise<void>
  close(): void
}

export const WhatsNewContext = createContext<WhatsNewContextValue | undefined>(undefined)
