import { CheckCircle } from './CheckCircle'
import { noteMorphName, useOpenNote } from '../../lib/motion/pageTransitions'
import { NoteStatusStrip } from './NoteStatusStrip'
import { SWATCH_CLASSES } from './swatchColors'
import { updateNote } from '../../lib/db/notes'
import { resolveNoteColor } from '../../lib/notes/resolveNoteColor'
import { applyOnCheckMove } from '../../lib/notes/onCheckMove'
import type { Note } from '../../types/note'
import type { Group } from '../../types/group'

interface BasicNoteCardProps {
  note: Note
  group: Group
  onChange: () => void
}

export function BasicNoteCard({ note, group, onChange }: BasicNoteCardProps) {
  const openNote = useOpenNote()
  const color = resolveNoteColor(note, group)

  async function toggleCompleted() {
    const next = !note.completed
    await updateNote(note.id, { completed: next })
    await applyOnCheckMove(note, group, note.completed, next)
    onChange()
  }

  return (
    <div
      onClick={(e) => openNote(e, note.id, color)}
      style={{ viewTransitionName: noteMorphName(note.id) }}
      className={`flex cursor-pointer flex-col rounded-card shadow-card ${SWATCH_CLASSES[color]}`}
    >
      <div className="flex items-start justify-between gap-2 p-4">
        <p
          className={`line-clamp-4 min-w-0 flex-1 text-sm font-medium text-black ${
            note.completed ? 'line-through opacity-70' : ''
          }`}
        >
          {note.title}
        </p>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <CheckCircle checked={note.completed} onChange={toggleCompleted} size={22} />
        </div>
      </div>
      <NoteStatusStrip statuses={note.statuses} color={color} />
    </div>
  )
}
