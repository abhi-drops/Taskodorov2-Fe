import { useNavigate } from 'react-router'
import { CheckCircle } from './CheckCircle'
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
  const navigate = useNavigate()
  const color = resolveNoteColor(note, group)

  async function toggleCompleted() {
    const next = !note.completed
    await updateNote(note.id, { completed: next })
    await applyOnCheckMove(note, group, note.completed, next)
    onChange()
  }

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}/edit`)}
      className={`flex cursor-pointer items-start justify-between gap-2 rounded-card p-4 shadow-card ${SWATCH_CLASSES[color]}`}
    >
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
  )
}
