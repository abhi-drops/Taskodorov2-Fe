import { CheckCircle } from './CheckCircle'
import { noteMorphName, useOpenNote } from '../../lib/motion/pageTransitions'
import { NoteStatusStrip } from './NoteStatusStrip'
import { SWATCH_CLASSES } from './swatchColors'
import { updateNote } from '../../lib/db/notes'
import { resolveNoteColor } from '../../lib/notes/resolveNoteColor'
import { applyOnCheckMove, isNoteFullyChecked } from '../../lib/notes/onCheckMove'
import type { Note, ListPayload } from '../../types/note'
import type { Group } from '../../types/group'

interface ListNoteCardProps {
  note: Note
  group: Group
  onChange: () => void
  /**
   * Diary replay (`DiaryReplayBoard`): render-only. Its interactive parts become `inert`
   * (no clicks, no focus, nothing written to the DB), clicking the card calls
   * `onSelect` instead of opening the editor, and it takes no morph name.
   */
  readOnly?: boolean
  onSelect?: () => void
}

export function ListNoteCard({ note, group, onChange, readOnly = false, onSelect }: ListNoteCardProps) {
  const openNote = useOpenNote()
  const color = resolveNoteColor(note, group)
  const payload = note.payload as ListPayload

  async function toggleItem(itemId: string) {
    const wasChecked = isNoteFullyChecked(note)
    const items = payload.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    )
    await updateNote(note.id, { payload: { items } })
    const isChecked = items.length > 0 && items.every((item) => item.completed)
    await applyOnCheckMove(note, group, wasChecked, isChecked)
    onChange()
  }

  return (
    <div
      onClick={(e) => (readOnly ? onSelect?.() : openNote(e, note.id, color))}
      style={{ viewTransitionName: readOnly ? undefined : noteMorphName(note.id) }}
      className="flex cursor-pointer flex-col"
    >
      <p
        className={`rounded-card px-4 pb-3 pt-4 text-sm font-medium text-black shadow-card transition-colors duration-300 ${SWATCH_CLASSES[color]}`}
      >
        {note.title}
      </p>
      <ul
        className={`ml-4 flex flex-col gap-1.5 rounded-card px-4 pb-4 pt-3 shadow-card transition-colors duration-300 ${SWATCH_CLASSES[color]}`}
      >
        {payload.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0" inert={readOnly} onClick={(e) => e.stopPropagation()}>
              <CheckCircle checked={item.completed} onChange={() => toggleItem(item.id)} size={18} />
            </div>
            <span className={`min-w-0 text-sm text-black ${item.completed ? 'line-through opacity-70' : ''}`}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="ml-4">
        <NoteStatusStrip statuses={note.statuses} color={color} />
      </div>
    </div>
  )
}
