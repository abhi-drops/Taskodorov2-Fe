import { Link } from 'react-router'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { PlusIcon } from './ui/icons'
import { BasicNoteCard } from './ui/BasicNoteCard'
import { CounterNoteCard } from './ui/CounterNoteCard'
import { ListNoteCard } from './ui/ListNoteCard'
import {
  noteDragId,
  groupDropId,
  groupChipDragId,
  type DragNoteData,
  type DragGroupChipData,
} from '../common_logics/useBoardDnd'
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

function NoteCard({ note, group, onChange }: { note: Note; group: Group; onChange: () => void }) {
  if (note.type === 'counter') {
    return <CounterNoteCard note={note} group={group} onChange={onChange} />
  }
  if (note.type === 'list') {
    return <ListNoteCard note={note} group={group} onChange={onChange} />
  }
  return <BasicNoteCard note={note} group={group} onChange={onChange} />
}

/**
 * Drag source for a note card. The whole card stays the click target that navigates to
 * the editor (see the *NoteCard components) — dnd-kit's activation constraints (a
 * mouse-move distance threshold, a touch long-press delay) keep a plain tap from being
 * swallowed as a drag, so no separate drag handle is needed.
 *
 * `touch-action: manipulation`, not `none` — this app uses a *delay*-based touch
 * activation (long-press), not distance-based, so the touch sensor's own delay+
 * tolerance already distinguishes a quick scroll swipe from a held press; `none` was
 * tried first but disables the browser's native scroll for any touch starting on a
 * card, which is most of a group's list, breaking vertical scrolling entirely.
 * `manipulation` still blocks double-tap-zoom while leaving panning/scroll to the
 * browser.
 */
function SortableNoteCard({ note, group, onChange }: { note: Note; group: Group; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: noteDragId(note.id),
    data: { type: 'note', noteId: note.id, groupId: note.groupId } satisfies DragNoteData,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'manipulation',
      }}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} group={group} onChange={onChange} />
    </div>
  )
}

/**
 * Drag source for a note in a non-`manual` group: still fully draggable (so it can be
 * moved to any other group at any time — see docs/feat-groups.md), but plain
 * `useDraggable` rather than `useSortable`/`SortableContext` since there's no
 * meaningful in-list position to animate — this group's order is always the sort
 * rule's, never a drop point.
 */
function DraggableNoteCard({ note, group, onChange }: { note: Note; group: Group; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: noteDragId(note.id),
    data: { type: 'note', noteId: note.id, groupId: note.groupId } satisfies DragNoteData,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'manipulation' }}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} group={group} onChange={onChange} />
    </div>
  )
}

function NoteList({ group, notes, onChange }: { group: Group; notes: Note[]; onChange: () => void }) {
  if (notes.length === 0) {
    return <p className="px-1 text-sm text-slate-500">No notes yet.</p>
  }

  if (group.sortedBy !== 'manual') {
    return (
      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <DraggableNoteCard key={note.id} note={note} group={group} onChange={onChange} />
        ))}
      </div>
    )
  }

  return (
    <SortableContext items={notes.map((n) => noteDragId(n.id))} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <SortableNoteCard key={note.id} note={note} group={group} onChange={onChange} />
        ))}
      </div>
    </SortableContext>
  )
}

/** Draggable column header chip — column reordering (web board only, see HomePage.tsx). */
function GroupChip({ group }: { group: Group }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupChipDragId(group.id),
    data: { type: 'group-chip', groupId: group.id } satisfies DragGroupChipData,
  })

  return (
    <h2
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      className="inline-flex cursor-grab items-center rounded-card border-[3px] border-ink bg-slate-300 px-3 py-1 font-display text-sm font-medium text-ink shadow-card active:cursor-grabbing"
    >
      {group.name}
    </h2>
  )
}

export function GroupColumn({ group, notes, onChange, showHeader = true }: GroupColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupDropId(group.id),
    data: { type: 'group', groupId: group.id },
  })

  if (!showHeader) {
    return (
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 rounded-card transition ${isOver ? 'ring-4 ring-accent-purple' : ''}`}
      >
        <NoteList group={group} notes={notes} onChange={onChange} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative z-10 flex items-center gap-3">
        <GroupChip group={group} />
        <Link
          to={`/notes/new?group=${group.id}`}
          viewTransition
          className="flex h-8 w-8 items-center justify-center rounded-card border-[3px] border-ink bg-accent-purple shadow-card"
          aria-label={`Add note to ${group.name}`}
        >
          <AnimatedIcon icon={PlusIcon} size={16} className="text-white [&_svg]:stroke-[2.5]" />
        </Link>
      </div>

      <div
        ref={setNodeRef}
        className={`-mt-7 -ml-4 border border-neutral-300 bg-surface p-4 pt-8 shadow-card transition ${
          isOver ? 'ring-4 ring-accent-purple' : ''
        }`}
      >
        <NoteList group={group} notes={notes} onChange={onChange} />
      </div>
    </div>
  )
}
