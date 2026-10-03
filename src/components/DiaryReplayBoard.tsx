import { AnimatePresence, LayoutGroup, MotionConfig, motion, type Variants } from 'motion/react'
import { BasicNoteCard } from './ui/BasicNoteCard'
import { CounterNoteCard } from './ui/CounterNoteCard'
import { ListNoteCard } from './ui/ListNoteCard'
import type { ReplayFrame } from '../lib/diary/replay'
import type { Group } from '../types/group'
import type { Note } from '../types/note'

/**
 * The Diary's read-only board for one replay frame (desktop). This is what makes
 * scrubbing read like video. Uses Motion:
 * - every card has `layoutId={note.id}` inside one `LayoutGroup`, so when a note moves
 *   between groups it **glides** from its old column to its new one, and cards reflow
 *   smoothly within a column;
 * - `AnimatePresence` fades and scales a card in on create and out on delete;
 * - a card that left a column because it *moved* (still alive in this frame) exits
 *   instantly, so only the glide is seen, never a fading ghost left behind. The exit
 *   reads the current alive set through `AnimatePresence`'s `custom`, which keeps
 *   updating for children that are already exiting;
 * - recolours cross-fade through the cards' own `transition-colors`;
 * - springs with `bounce: 0` (no overshoot, per the style guide) are interruptible, so
 *   dragging the scrubber fast never queues up animations;
 * - `MotionConfig reducedMotion="user"` turns all of it off under reduced motion.
 */

const TRANSITION = { type: 'spring', bounce: 0, duration: 0.4 } as const

function ReplayCard({ note, group, onSelect }: { note: Note; group: Group; onSelect: () => void }) {
  const noop = () => {}
  if (note.type === 'counter') return <CounterNoteCard note={note} group={group} onChange={noop} readOnly onSelect={onSelect} />
  if (note.type === 'list') return <ListNoteCard note={note} group={group} onChange={noop} readOnly onSelect={onSelect} />
  return <BasicNoteCard note={note} group={group} onChange={noop} readOnly onSelect={onSelect} />
}

function cardVariants(noteId: string): Variants {
  return {
    enter: { opacity: 0, scale: 0.92 },
    present: { opacity: 1, scale: 1 },
    exit: (alive: Set<string>) =>
      alive.has(noteId) ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.92 },
  }
}

interface DiaryReplayBoardProps {
  frame: ReplayFrame
  groupsById: Map<string, Group>
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  /** Sizing for the board's scroll box, e.g. a fixed screen-relative height. */
  className?: string
}

export function DiaryReplayBoard({
  frame,
  groupsById,
  selectedNoteId,
  onSelectNote,
  className = '',
}: DiaryReplayBoardProps) {
  const alive = new Set(frame.notes.map((n) => n.id))

  if (frame.groupIds.length === 0) {
    return (
      <div className={className}>
        <p className="px-1 py-10 text-center text-sm text-slate-500">No groups existed on this day yet.</p>
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user" transition={TRANSITION}>
      <LayoutGroup>
        {/* One scroll box for both directions (many columns, tall columns). `layoutScroll`
            is required: without it Motion measures layout animations ignoring the scroll
            offset, so after scrolling, gliding cards would jump from the wrong place. */}
        <motion.div layoutScroll className={`overflow-auto overscroll-contain ${className}`}>
          {/* Padding lives inside the scroll box, so there's room around the board on
              every side, even at the scrolled ends. pl-10 = 6 + 4: each column's backdrop
              is pulled 1rem left (-ml-4) under its chip, as on the main board. */}
          <div className="flex w-max min-w-full items-start gap-8 p-6 pl-10">
            {frame.groupIds.map((groupId) => {
              const group = groupsById.get(groupId)
              if (!group) return null
              const notes = frame.notes.filter((n) => n.groupId === groupId)
              return (
                <motion.div key={groupId} layout className="flex w-64 shrink-0 flex-col">
                  {/* Same overlapping chip + backdrop treatment as GroupColumn, read-only. */}
                  <h3 className="relative z-10 inline-flex self-start rounded-card border-[3px] border-ink bg-slate-300 px-3 py-1 font-display text-sm font-medium text-ink shadow-card">
                    {group.name}
                  </h3>
                  <div className="relative -ml-4 -mt-4 flex min-h-20 flex-col gap-3 border border-neutral-300 bg-surface p-4 pt-7 shadow-card">
                    <AnimatePresence initial={false} mode="popLayout" custom={alive}>
                      {notes.map((note) => (
                        <motion.div
                          key={note.id}
                          layoutId={note.id}
                          layout
                          custom={alive}
                          variants={cardVariants(note.id)}
                          initial="enter"
                          animate="present"
                          exit="exit"
                          className={selectedNoteId === note.id ? 'ring-2 ring-accent-purple ring-offset-2' : ''}
                        >
                          <ReplayCard note={note} group={group} onSelect={() => onSelectNote(note.id)} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {notes.length === 0 && <p className="px-1 text-sm text-slate-500">No notes.</p>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  )
}
