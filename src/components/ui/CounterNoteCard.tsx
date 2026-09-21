import { useNavigate } from 'react-router'
import { CheckCircle } from './CheckCircle'
import { NoteStatusStrip } from './NoteStatusStrip'
import { SWATCH_CLASSES } from './swatchColors'
import { updateNote } from '../../lib/db/notes'
import { resolveNoteColor } from '../../lib/notes/resolveNoteColor'
import { adjustCounterValue, shouldAutoComplete } from '../../lib/notes/counterLogic'
import { applyOnCheckMove } from '../../lib/notes/onCheckMove'
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
    await applyOnCheckMove(note, group, note.completed, completed)
    onChange()
  }

  async function toggleCompleted() {
    const next = !note.completed
    await updateNote(note.id, { completed: next })
    await applyOnCheckMove(note, group, note.completed, next)
    onChange()
  }

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}/edit`)}
      className={`flex cursor-pointer flex-col rounded-card shadow-card ${SWATCH_CLASSES[color]}`}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-black">{note.title}</p>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <CheckCircle checked={note.completed} onChange={toggleCompleted} size={22} />
          </div>
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-stretch rounded-card border-[3px] border-ink divide-x-[3px] divide-ink overflow-hidden"
        >
          <button
            type="button"
            onClick={() => adjust(payload.step)}
            className="bg-white/50 px-3 py-2 font-display text-3xl font-bold text-ink hover:bg-white/60"
          >
            +
          </button>
          <span className="flex flex-1 items-center justify-center text-center font-display text-xl font-bold text-ink">
            {payload.target ? `${payload.value}/${payload.target}` : payload.value}
          </span>
          <button
            type="button"
            onClick={() => adjust(-payload.step)}
            className="bg-white/50 px-3 py-2 font-display text-3xl font-bold text-ink hover:bg-white/60"
          >
            −
          </button>
        </div>
      </div>
      <NoteStatusStrip statuses={note.statuses} color={color} />
    </div>
  )
}
