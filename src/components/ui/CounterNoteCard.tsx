import { useNavigate } from 'react-router'
import { CheckCircle } from './CheckCircle'
import { SWATCH_CLASSES } from './swatchColors'
import { updateNote } from '../../lib/db/notes'
import { resolveNoteColor } from '../../lib/notes/resolveNoteColor'
import { adjustCounterValue, shouldAutoComplete } from '../../lib/notes/counterLogic'
import type { Note, CounterPayload } from '../../types/note'
import type { Group } from '../../types/group'

interface CounterNoteCardProps {
  note: Note
  group: Group
  onChange: () => void
}

export function CounterNoteCard({ note, group, onChange }: CounterNoteCardProps) {
  const navigate = useNavigate()
  const color = resolveNoteColor(note, group)
  const payload = note.payload as CounterPayload

  async function adjust(delta: number) {
    const nextPayload = adjustCounterValue(payload, delta)
    const completed = shouldAutoComplete(nextPayload, note.completed) ? true : note.completed
    await updateNote(note.id, { payload: nextPayload, completed })
    onChange()
  }

  async function toggleCompleted() {
    await updateNote(note.id, { completed: !note.completed })
    onChange()
  }

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}/edit`)}
      className={`flex cursor-pointer flex-col gap-3 rounded-card p-4 shadow-lg ${SWATCH_CLASSES[color]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 flex-1 text-sm font-medium text-nav-dark">{note.title}</p>
        <div onClick={(e) => e.stopPropagation()}>
          <CheckCircle checked={note.completed} onChange={toggleCompleted} size={22} />
        </div>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center overflow-hidden rounded-card bg-white/40"
      >
        <button
          type="button"
          onClick={() => adjust(-payload.step)}
          className="px-3 py-2 font-bold text-nav-dark hover:bg-white/40"
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-nav-dark">{payload.value}</span>
        <button
          type="button"
          onClick={() => adjust(payload.step)}
          className="px-3 py-2 font-bold text-nav-dark hover:bg-white/40"
        >
          +
        </button>
      </div>
    </div>
  )
}
