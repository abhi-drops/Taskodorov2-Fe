import { useNavigate } from 'react-router'
import { CheckCircle } from './CheckCircle'
import { SWATCH_CLASSES } from './swatchColors'
import { updateNote } from '../../lib/db/notes'
import { resolveNoteColor } from '../../lib/notes/resolveNoteColor'
import type { Note, ListPayload } from '../../types/note'
import type { Group } from '../../types/group'

interface ListNoteCardProps {
  note: Note
  group: Group
  onChange: () => void
}

export function ListNoteCard({ note, group, onChange }: ListNoteCardProps) {
  const navigate = useNavigate()
  const color = resolveNoteColor(note, group)
  const payload = note.payload as ListPayload

  async function toggleItem(itemId: string) {
    const items = payload.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    )
    await updateNote(note.id, { payload: { items } })
    onChange()
  }

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}/edit`)}
      className={`flex cursor-pointer flex-col gap-2 rounded-card p-4 shadow-lg ${SWATCH_CLASSES[color]}`}
    >
      <p className="text-sm font-medium text-nav-dark">{note.title}</p>
      <ul className="flex flex-col gap-1.5">
        {payload.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <CheckCircle checked={item.completed} onChange={() => toggleItem(item.id)} size={18} />
            </div>
            <span className={`text-sm text-nav-dark ${item.completed ? 'line-through opacity-70' : ''}`}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
