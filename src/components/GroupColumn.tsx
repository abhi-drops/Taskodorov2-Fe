import { Link } from 'react-router'
import { Icon } from './ui/Icon'
import { BasicNoteCard } from './ui/BasicNoteCard'
import { CounterNoteCard } from './ui/CounterNoteCard'
import { ListNoteCard } from './ui/ListNoteCard'
import pluseIcon from '../assets/pluse.png'
import type { Group } from '../types/group'
import type { Note } from '../types/note'

interface GroupColumnProps {
  group: Group
  notes: Note[]
  onChange: () => void
  /**
   * The chip header, add-note button, and backdrop card are desktop-column chrome —
   * on mobile the group name/switching is already handled by the Tabs strip above,
   * so this is off there and only the bare note list renders.
   */
  showHeader?: boolean
}

function NoteList({ group, notes, onChange }: { group: Group; notes: Note[]; onChange: () => void }) {
  if (notes.length === 0) {
    return <p className="px-1 text-sm text-slate-500">No notes yet.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => {
        if (note.type === 'counter') {
          return <CounterNoteCard key={note.id} note={note} group={group} onChange={onChange} />
        }
        if (note.type === 'list') {
          return <ListNoteCard key={note.id} note={note} group={group} onChange={onChange} />
        }
        return <BasicNoteCard key={note.id} note={note} group={group} onChange={onChange} />
      })}
    </div>
  )
}

export function GroupColumn({ group, notes, onChange, showHeader = true }: GroupColumnProps) {
  if (!showHeader) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <NoteList group={group} notes={notes} onChange={onChange} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative z-10 flex items-center gap-3">
        <h2 className="inline-flex items-center rounded-card border-[3px] border-ink bg-slate-300 px-3 py-1 font-display text-sm font-medium text-ink shadow-card">
          {group.name}
        </h2>
        <Link
          to={`/notes/new?group=${group.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-card border-[3px] border-ink bg-accent-purple shadow-card"
          aria-label={`Add note to ${group.name}`}
        >
          <Icon src={pluseIcon} alt="" size={14} className="[filter:brightness(0)_invert(1)]" />
        </Link>
      </div>

      <div className="-mt-7 -ml-4 border border-neutral-300 bg-surface p-4 pt-8 shadow-card">
        <NoteList group={group} notes={notes} onChange={onChange} />
      </div>
    </div>
  )
}
