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
