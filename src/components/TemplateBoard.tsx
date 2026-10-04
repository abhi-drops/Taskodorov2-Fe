import { useState } from 'react'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { PlusIcon, SettingsIcon } from './ui/icons'
import { BasicNoteCard } from './ui/BasicNoteCard'
import { CounterNoteCard } from './ui/CounterNoteCard'
import { ListNoteCard } from './ui/ListNoteCard'
import { CHIP } from './SidebarPanelLayout'
import { previewGroup, previewNote } from '../lib/templates/preview'
import type { TemplateContent, TemplateGroup } from '../types/template'

const noop = () => {}

/**
 * A template group's sample notes as the real note cards, `readOnly` (so nothing can
 * reach the database) with a click opening the sample-note dialog instead of the note
 * editor. Shared by the desktop columns and the mobile single-group view.
 */
export function TemplateNoteList({
  group,
  position,
  onSelectNote,
}: {
  group: TemplateGroup
  position: number
  onSelectNote: (noteKey: string) => void
}) {
  const asGroup = previewGroup(group, position)
  if (group.notes.length === 0) return <p className="px-1 text-sm text-slate-500">No sample notes.</p>
  return (
    <>
      {group.notes.map((templateNote, i) => {
        const note = previewNote(templateNote, group.key, i)
        const props = { note, group: asGroup, onChange: noop, readOnly: true, onSelect: () => onSelectNote(note.id) }
        if (note.type === 'counter') return <CounterNoteCard key={note.id} {...props} />
        if (note.type === 'list') return <ListNoteCard key={note.id} {...props} />
        return <BasicNoteCard key={note.id} {...props} />
      })}
    </>
  )
}

/** The "+ New group" chip, the same control Settings uses to add a group. */
export function NewTemplateGroupInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <div className={`${CHIP} justify-between`}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd()
        }}
        placeholder="+ New group"
        className="min-w-0 flex-1 bg-transparent font-medium text-ink outline-none placeholder:text-ink/50"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
      >
        Add
      </button>
    </div>
  )
}

interface TemplateBoardProps {
  content: TemplateContent
  onOpenGroup: (groupKey: string) => void
  onAddNote: (groupKey: string) => void
  onSelectNote: (noteKey: string) => void
  onAddGroup: (name: string) => void
}

/**
 * The template editor's board (desktop): every group as a column, drawn like the real
 * board (and like `DiaryReplayBoard`): a chip that overlaps a backdrop card holding the
 * notes. The chip opens that group's settings, the purple "+" adds a sample note, and
 * the last column adds a group.
 */
export function TemplateBoard({ content, onOpenGroup, onAddNote, onSelectNote, onAddGroup }: TemplateBoardProps) {
  return (
    <div className="overflow-x-auto overscroll-contain">
      {/* pl-10 = 6 + 4: each column's backdrop is pulled 1rem left (-ml-4) under its chip,
          as on the main board. */}
      <div className="flex w-max min-w-full items-start gap-8 p-6 pl-10">
        {content.groups.map((group, i) => (
          <div key={group.key} className="flex w-64 shrink-0 flex-col">
            <div className="relative z-10 flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => onOpenGroup(group.key)}
                aria-label={`${group.name} settings`}
                className="inline-flex max-w-48 items-center gap-2 rounded-card border-[3px] border-ink bg-slate-300 px-3 py-1 font-display text-sm font-medium text-ink shadow-card"
              >
                <span className="truncate">{group.name}</span>
                <AnimatedIcon icon={SettingsIcon} size={14} />
              </button>
              <button
                type="button"
                onClick={() => onAddNote(group.key)}
                aria-label={`Add sample note to ${group.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card border-[3px] border-ink bg-accent-purple shadow-card"
              >
                <AnimatedIcon icon={PlusIcon} size={16} className="text-white [&_svg]:stroke-[2.5]" />
              </button>
            </div>
            <div className="relative -ml-4 -mt-4 flex min-h-20 flex-col gap-3 border border-neutral-300 bg-surface p-4 pt-7 shadow-card">
              <TemplateNoteList group={group} position={i} onSelectNote={onSelectNote} />
            </div>
          </div>
        ))}
        <div className="w-64 shrink-0">
          <NewTemplateGroupInput onAdd={onAddGroup} />
        </div>
      </div>
    </div>
  )
}
