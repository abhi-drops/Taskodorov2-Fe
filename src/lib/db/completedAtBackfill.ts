import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { isNoteFullyChecked } from '../notes/noteChecked'
import type { NotePayload, NoteType } from '../../types/note'

interface CheckedCandidate {
  id: string
  type: string
  completed: number
  payload: string
  updated_at: number
}

interface FieldEvent {
  new_value: string | null
  created_at: number
}

/** Whether a logged value of the note's checked-defining field means "fully checked". */
function isCheckedValue(type: string, value: string | null): boolean {
  if (type !== 'list') return value === '1'
  try {
    const items = JSON.parse(value ?? '[]') as { completed?: boolean }[]
    return items.length > 0 && items.every((item) => item.completed)
  } catch {
    return false
  }
}

/**
 * Stamps `completed_at` on notes that are fully checked but have none — checked before
 * "Hide Notes After" tracked it, or pulled from a backend that predates it. Without a
 * stamp the hide rule falls back to `updated_at`, which any later write to the row (a
 * drag, a reindex, an edit) resets, so such a note would reappear for the full hide
 * window again and again.
 *
 * The real check time is recovered from the Diary: the oldest event of the trailing run
 * of "checked" values for the note's checked field (`completed`, or `list` for a list
 * note). With no event (checked before the Diary existed), `updated_at` is the best
 * guess left. The note is marked dirty but `updated_at` is kept, so the stamp syncs up
 * without making the note look freshly edited. Idempotent: stamped notes are skipped.
 */
export async function backfillCompletedAt(db: SQLiteDBConnection): Promise<void> {
  const { values } = await db.query(
    'SELECT id, type, completed, payload, updated_at FROM notes WHERE completed_at IS NULL AND deleted_at IS NULL',
  )
  const candidates = ((values ?? []) as CheckedCandidate[]).filter((row) =>
    isNoteFullyChecked({
      type: row.type as NoteType,
      completed: row.completed === 1,
      payload: JSON.parse(row.payload) as NotePayload,
    }),
  )

  for (const note of candidates) {
    const field = note.type === 'list' ? 'list' : 'completed'
    const { values: events } = await db.query(
      `SELECT new_value, created_at FROM activity_events
       WHERE entity_type = 'note' AND entity_id = ? AND field = ?
       ORDER BY created_at DESC`,
      [note.id, field],
    )
    let checkedAt: number | null = null
    for (const event of (events ?? []) as FieldEvent[]) {
      if (!isCheckedValue(note.type, event.new_value)) break
      checkedAt = event.created_at
    }
    await db.run('UPDATE notes SET completed_at = ?, dirty = 1 WHERE id = ?', [
      checkedAt ?? note.updated_at,
      note.id,
    ])
  }
}
