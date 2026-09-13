import { listNotesByGroup, updateNote } from '../db/notes'
import type { Group } from '../../types/group'
import type { ListPayload, Note } from '../../types/note'

/** True once every check that defines "done" for this note type is satisfied: the
 * checkmark for basic/counter (counter's own checkmark already folds in its
 * target-reached auto-complete, see `counterLogic.ts`), or every subtask checked for a
 * list note (which has no card-level checkmark of its own). */
export function isNoteFullyChecked(note: Pick<Note, 'type' | 'completed' | 'payload'>): boolean {
  if (note.type === 'list') {
    const items = (note.payload as ListPayload).items
    return items.length > 0 && items.every((item) => item.completed)
  }
  return note.completed
}

/**
 * Kanban-style reset applied when a note lands in its "On Check Move To" destination:
 * it arrives unchecked, ready for whatever happens in that group next, rather than
 * showing up already marked done. Basic/counter: `completed` flips back to `false`
 * (a counter's `value`/`target` are left untouched — only the checkmark resets).
 * List: every subtask's `completed` resets to `false` (item id/text unchanged).
 */
function buildResetPatch(note: Pick<Note, 'type' | 'payload'>): Partial<Pick<Note, 'completed' | 'payload'>> {
  if (note.type === 'list') {
    const items = (note.payload as ListPayload).items.map((item) => ({ ...item, completed: false }))
    return { payload: { items } }
  }
  return { completed: false }
}

export interface OnCheckMoveResult {
  destGroupId: string
  /** Whether the reset-to-unchecked patch was applied — mirrors the source group's
   * `resetOnMove` setting at the moment the move fired. */
  reset: boolean
}

/**
 * Fires a group's "On Check Move To" rule: once a note transitions from unchecked to
 * fully checked, it's relocated to the configured destination group, appended at the
 * end of it. One-directional by design — later unchecking the note (or the counter
 * dropping back below target, or a subtask being unchecked) never moves it back; see
 * `docs/feat-groups.md`.
 *
 * Whether it also resets to unchecked there (`buildResetPatch`) is gated on the source
 * group's `resetOnMove` setting (Group Settings, default on) — off leaves the note
 * showing checked/done in its new group instead.
 *
 * Returns `null` when no move happened, else `{ destGroupId, reset }` — callers that
 * keep the note's group in local state (e.g. the note editor, open across the move)
 * need `destGroupId` to refresh it, so a later re-check in the same session evaluates
 * the *destination* group's own rule instead of stale source-group data, and `reset` to
 * mirror the same checked-state reset (or lack of one) into that local state.
 */
export async function applyOnCheckMove(
  note: Pick<Note, 'id' | 'type' | 'payload'>,
  currentGroup: Group,
  wasChecked: boolean,
  isChecked: boolean,
): Promise<OnCheckMoveResult | null> {
  if (wasChecked || !isChecked) return null
  const destGroupId = currentGroup.onCheckMoveToGroupId
  if (!destGroupId || destGroupId === currentGroup.id) return null

  const reset = currentGroup.resetOnMove
  const destSiblings = await listNotesByGroup(destGroupId)
  await updateNote(note.id, {
    groupId: destGroupId,
    position: destSiblings.length,
    ...(reset ? buildResetPatch(note) : {}),
  })
  return { destGroupId, reset }
}
