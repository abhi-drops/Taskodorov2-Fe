import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { PlusIcon } from './ui/icons'
import { BasicNoteCard } from './ui/BasicNoteCard'
import { CounterNoteCard } from './ui/CounterNoteCard'
import { ListNoteCard } from './ui/ListNoteCard'
import { SWATCH_CLASSES } from './ui/swatchColors'
import {
  noteDragId,
  groupDropId,
  groupChipDragId,
  type DragNoteData,
  type DragGroupChipData,
} from '../common_logics/useBoardDnd'
import { isNoteHidden } from '../lib/notes/hiddenNotes'
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
  /** Notes this group's "Hide Notes After" rule is hiding right now (see `useBoard`). */
  hiddenCount: number
  /** Whether those hidden notes are currently included in `notes`. */
  showingHidden: boolean
  onToggleHidden: () => void
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

/** Which way the hidden notes are currently animating (`index.css`'s `note-reveal`/`note-hide`). */
type HiddenAnim = {
  kind: 'reveal' | 'hide'
  /** When it started: the clock the hide rule is evaluated against, so which notes animate is fixed for the run. */
  at: number
} | null

const REVEAL_MS = 280
const HIDE_MS = 240
/** Each hidden note starts this much after the one above it; capped so a long pile stays quick. */
const STAGGER_MS = 40
const MAX_STAGGER = 6

interface NoteListProps {
  group: Group
  notes: Note[]
  onChange: () => void
  hiddenCount: number
  showingHidden: boolean
  onToggleHidden: () => void
  anim: HiddenAnim
  /** The bar's wrapper, so the column can scroll it into view after a toggle. */
  barRef: RefObject<HTMLDivElement | null>
}

function NoteList({
  group,
  notes,
  onChange,
  hiddenCount,
  showingHidden,
  onToggleHidden,
  anim,
  barRef,
}: NoteListProps) {
  // Only the notes the rule hides animate; the ones that were always visible stay put.
  let hiddenIndex = 0
  const slot = (note: Note, card: ReactNode) => {
    if (!anim || !isNoteHidden(note, group, anim.at)) return card
    const delay = Math.min(hiddenIndex++, MAX_STAGGER) * STAGGER_MS
    return (
      <div key={note.id} className={anim.kind === 'reveal' ? 'note-reveal' : 'note-hide'} style={{ animationDelay: `${delay}ms` }}>
        {card}
      </div>
    )
  }

  let list
  if (notes.length === 0) {
    list = (
      <p className="px-1 text-sm text-muted">{hiddenCount > 0 ? 'All notes hidden.' : 'No notes yet.'}</p>
    )
  } else if (group.sortedBy !== 'manual') {
    list = (
      <div className="flex flex-col gap-3">
        {notes.map((note) =>
          slot(note, <DraggableNoteCard key={note.id} note={note} group={group} onChange={onChange} />),
        )}
      </div>
    )
  } else {
    list = (
      <SortableContext items={notes.map((n) => noteDragId(n.id))} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {notes.map((note) =>
            slot(note, <SortableNoteCard key={note.id} note={note} group={group} onChange={onChange} />),
          )}
        </div>
      </SortableContext>
    )
  }

  return (
    <>
      {list}
      {hiddenCount > 0 && (
        // Collapsed, two offset sheets peek out from behind the bar like a pile of
        // cards; revealed, the pile is gone and the bar is just the way to put them away.
        <div
          ref={barRef}
          // The bottom margin keeps a scrolled-to bar clear of the mobile bottom nav.
          className={`group/pile relative scroll-mb-28 ${showingHidden ? 'mt-3' : 'mt-3 mb-3'}`}
        >
          {!showingHidden && (
            <>
              <span aria-hidden className={`absolute inset-x-3 top-[11px] h-full rounded-card shadow-card transition-transform duration-200 group-hover/pile:translate-y-1 group-hover/pile:rotate-2 motion-reduce:transition-none ${SWATCH_CLASSES.blue}`} />
              <span aria-hidden className={`absolute inset-x-1.5 top-[6px] h-full rounded-card shadow-card transition-transform duration-200 group-hover/pile:translate-y-0.5 group-hover/pile:-rotate-1 motion-reduce:transition-none ${SWATCH_CLASSES.coral}`} />
            </>
          )}
          <button
            type="button"
            onClick={onToggleHidden}
            aria-expanded={showingHidden}
            aria-label={showingHidden ? `Hide ${hiddenCount} notes again` : `Show ${hiddenCount} hidden notes`}
            className={`relative flex w-full items-center justify-center gap-1.5 rounded-card px-3 py-1 text-xs font-medium text-black shadow-card transition duration-200 hover:-translate-y-px hover:brightness-95 active:translate-y-px active:scale-[0.98] motion-reduce:transition-none ${SWATCH_CLASSES.yellow}`}
          >
            {showingHidden ? (
              <>
                {hiddenCount} shown <span aria-hidden>·</span> Hide
              </>
            ) : (
              `${hiddenCount} hidden`
            )}
          </button>
        </div>
      )}
    </>
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

export function GroupColumn({
  group,
  notes,
  onChange,
  showHeader = true,
  hiddenCount,
  showingHidden,
  onToggleHidden,
}: GroupColumnProps) {
  const [anim, setAnim] = useState<HiddenAnim>(null)
  const animTimer = useRef<number | undefined>(undefined)
  const followFrame = useRef<number | undefined>(undefined)
  useEffect(
    () => () => {
      window.clearTimeout(animTimer.current)
      cancelAnimationFrame(followFrame.current ?? 0)
    },
    [],
  )
  const barRef = useRef<HTMLDivElement>(null)

  /** Revealing makes the list longer and hiding makes it shorter; either way the bar
   *  moves, so keep it in view (it is the control the user just pressed). */
  function scrollBarIntoView() {
    barRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }

  /**
   * Scrolls *with* the animation rather than after it: every frame for `ms`, nudge the
   * page just far enough to keep the bar in view as the notes open or close and carry it
   * along. Instant per-frame steps, because a smooth scroll started against a moving
   * target would lag behind it.
   */
  function followBar(ms: number) {
    cancelAnimationFrame(followFrame.current ?? 0)
    const end = performance.now() + ms
    const step = () => {
      scrollBarIntoView()
      if (performance.now() < end) followFrame.current = requestAnimationFrame(step)
    }
    // First step on the next frame, once the notes have rendered and started moving the bar.
    followFrame.current = requestAnimationFrame(step)
  }

  /** Reveal swaps the notes in first, then plays in; hide plays out first, then swaps them out. */
  function handleToggleHidden() {
    window.clearTimeout(animTimer.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnim(null)
      onToggleHidden()
      // After React has rendered the new list.
      animTimer.current = window.setTimeout(scrollBarIntoView, 50)
    } else if (showingHidden) {
      const ms = HIDE_MS + MAX_STAGGER * STAGGER_MS
      setAnim({ kind: 'hide', at: Date.now() })
      followBar(ms)
      animTimer.current = window.setTimeout(() => {
        onToggleHidden()
        setAnim(null)
        animTimer.current = window.setTimeout(scrollBarIntoView, 50)
      }, ms)
    } else {
      const ms = REVEAL_MS + MAX_STAGGER * STAGGER_MS
      onToggleHidden()
      setAnim({ kind: 'reveal', at: Date.now() })
      followBar(ms)
      animTimer.current = window.setTimeout(() => {
        setAnim(null)
        // Not in the same tick: dropping the animation wrappers re-renders the cards.
        animTimer.current = window.setTimeout(scrollBarIntoView, 50)
      }, ms)
    }
  }

  const list = (
    <NoteList
      group={group}
      notes={notes}
      onChange={onChange}
      hiddenCount={hiddenCount}
      showingHidden={showingHidden}
      onToggleHidden={handleToggleHidden}
      anim={anim}
      barRef={barRef}
    />
  )

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
        {list}
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
          data-tour="add-note"
        >
          <AnimatedIcon icon={PlusIcon} size={16} className="text-white [&_svg]:stroke-[2.5]" />
        </Link>
      </div>

      <div
        ref={setNodeRef}
        className={`-mt-7 -ml-4 border border-edge bg-panel p-4 pt-8 shadow-card transition ${
          isOver ? 'ring-4 ring-accent-purple' : ''
        }`}
      >
        {list}
      </div>
    </div>
  )
}
