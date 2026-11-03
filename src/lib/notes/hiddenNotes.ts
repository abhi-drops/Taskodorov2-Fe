import { isNoteFullyChecked } from './noteChecked'
import type { Group } from '../../types/group'
import type { Note } from '../../types/note'

const HOUR_MS = 60 * 60 * 1000
const UNIT_MS = { hours: HOUR_MS, days: 24 * HOUR_MS } as const

/** The largest amount Group Settings accepts, per unit. */
export const MAX_HIDE_AFTER = { hours: 999, days: 365 } as const

/**
 * Whether Group Settings' "Hide Notes After" hides this note on the board right now: the
 * group hides checked notes, the note is fully checked, and it has been for at least the
 * configured time. `completedAt` is the clock; a note checked before it was tracked (or
 * synced from a backend that doesn't send it) falls back to `updatedAt`.
 */
export function isNoteHidden(note: Note, group: Group, now: number): boolean {
  if (group.hideAfterMode !== 'checked') return false
  if (!isNoteFullyChecked(note)) return false
  const checkedAt = note.completedAt ?? note.updatedAt
  return now >= checkedAt + group.hideAfterAmount * UNIT_MS[group.hideAfterUnit]
}
