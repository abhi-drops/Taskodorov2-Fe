import { addDays, format, startOfDay } from 'date-fns'
import type { ActivityEvent, DayTimelineSource, MonthActivitySource } from '../db/events'
import type { ListSnapshotItem } from '../db/eventLog'
import type { CounterPayload, ListPayload, Note } from '../../types/note'
import type { Group } from '../../types/group'

/**
 * Pure Diary logic: no React, no SQLite. It turns raw activity rows (`lib/db/events.ts`)
 * into calendar counts and a day's replay frames. See `docs/feat-diary.md`.
 *
 * Key ideas:
 * - **Genesis events:** creating a note logs the starting value of every tracked field
 *   (title, colour, checked, counter, list) as `field_changed` at the same timestamp as
 *   `created` (`eventLog.ts`). Those are bookkeeping, not edits: never counted, never
 *   their own frame, and applied together with their `created` so a new note appears
 *   fully formed on its own frame.
 * - **Frames:** frame 0 is the board at the start of the day, then one frame per change.
 *   Group created/deleted events change which columns exist but aren't stops of their
 *   own; they're folded into the next frame.
 * - **Counter bursts:** consecutive taps on the same counter (each within
 *   `COUNTER_MERGE_MS` of the last, nothing else in between) are **one** change and one
 *   frame. Every tap is still kept (`taps`) so the list can expand to show them.
 * - **Reset on move:** an On Check Move To with "reset on move" writes the move and the
 *   reset (unchecked / list items cleared) in one update, at one timestamp. The reset is
 *   folded into the move entry (`resetOnMove`), not listed as a separate uncheck.
 * - **Precomputed:** every frame's board state is built up front, so the scrubber only
 *   indexes an array and never queries the database. Unchanged notes are shared
 *   between frames.
 * - **Historical vs current:** group, title, colour, existence, statuses, checked state,
 *   counter value and list items are historical. Description, priority and counter
 *   step/target show their *current* values. Group names and order are current too
 *   (renames aren't tracked). Backfilled history (pre-Diary data) has no past moves or
 *   edits.
 */

export const dayKey = (date: Date | number) => format(date, 'yyyy-MM-dd')

/** Wraps a title or status in curly quotes for the plain-sentence `text`. */
const quote = (value: string) => `“${value || 'Untitled'}”`

/** Time of day in the device's own format (e.g. "3:53 PM" or "15:53"), like status timestamps. */
const timeOfDayFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
export const formatTimeOfDay = (time: number) => timeOfDayFormat.format(time)

/** Counter taps closer together than this (with nothing else in between) merge into one change. */
export const COUNTER_MERGE_MS = 60_000

/** Recognises same-timestamp genesis `field_changed` events (see above). */
function genesisChecker(events: ActivityEvent[]) {
  const createdAt = new Map<string, number>()
  for (const e of events) if (e.action === 'created') createdAt.set(e.entityId, e.createdAt)
  return (e: ActivityEvent) => e.action === 'field_changed' && createdAt.get(e.entityId) === e.createdAt
}

/** Field changes written by the same update as a move: an automatic reset on move. */
const isResetField = (e: ActivityEvent) =>
  e.action === 'field_changed' && (e.field === 'completed' || e.field === 'list' || e.field === 'counter')

function parseList(value: string | null): ListSnapshotItem[] {
  try {
    const parsed = JSON.parse(value ?? '[]') as ListSnapshotItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- calendar counts

export interface DayCounts {
  created: number
  moved: number
  /** Rollup for the calendar cell: edits, checks, counter bursts, list updates, statuses, deletions. */
  changes: number
}

/**
 * Per-day counts (keyed by `dayKey`) for the calendar, from a month's raw activity. It
 * merges counter bursts and folds resets into moves exactly like the day replay, so the
 * calendar chips agree with what the day view lists.
 */
export function bucketMonth(source: MonthActivitySource, from: number, to: number): Map<string, DayCounts> {
  const days = new Map<string, DayCounts>()
  const bump = (time: number, key: keyof DayCounts) => {
    const k = dayKey(time)
    const counts = days.get(k) ?? { created: 0, moved: 0, changes: 0 }
    counts[key]++
    days.set(k, counts)
  }

  const isGenesis = genesisChecker(source.events)
  const moves = new Set<string>()
  // Last list snapshot seen per note, so a reorder-only update (no visible change) isn't
  // counted, matching the day view. A note's first list event in the month has no
  // earlier snapshot in this query window and is counted as before.
  const lastList = new Map<string, ListSnapshotItem[]>()
  let previous: ActivityEvent | null = null
  for (const e of source.events) {
    if (e.entityType !== 'note') continue
    if (e.action === 'created') bump(e.createdAt, 'created')
    else if (e.action === 'moved') {
      moves.add(`${e.entityId}@${e.createdAt}`)
      bump(e.createdAt, 'moved')
    } else if (e.action === 'deleted') bump(e.createdAt, 'changes')
    else if (e.action === 'field_changed') {
      const prevList = e.field === 'list' ? lastList.get(e.entityId) : undefined
      if (e.field === 'list') lastList.set(e.entityId, parseList(e.newValue))
      if (!isGenesis(e)) {
        const foldedIntoMove = isResetField(e) && moves.has(`${e.entityId}@${e.createdAt}`)
        const continuesBurst =
          e.field === 'counter' &&
          previous?.field === 'counter' &&
          previous.entityId === e.entityId &&
          e.createdAt - previous.createdAt <= COUNTER_MERGE_MS
        const noVisibleListChange =
          e.field === 'list' && prevList !== undefined && diffList(prevList, parseList(e.newValue)).length === 0
        if (!foldedIntoMove && !continuesBurst && !noVisibleListChange) bump(e.createdAt, 'changes')
      }
    }
    previous = e
  }
  for (const note of source.notes) {
    for (const status of note.statuses) {
      if (status.createdAt >= from && status.createdAt < to) bump(status.createdAt, 'changes')
    }
  }
  return days
}

// ---------------------------------------------------------------- day replay

export type FeedKind =
  | 'created'
  | 'moved'
  | 'deleted'
  | 'title'
  | 'color'
  | 'status'
  | 'checked'
  | 'unchecked'
  | 'counter'
  | 'list'

export type ListChangeKind = 'added' | 'removed' | 'checked' | 'unchecked' | 'edited'

/** One item-level change inside a list update. */
export interface ListChange {
  change: ListChangeKind
  text: string
  /** `edited`: the item's text before. */
  previousText?: string
}

/**
 * One change in a day's feed. Structured, so the list can render it visually (an action
 * chip, the note title, group chips, colour swatches, a status strip, counter values,
 * item-level list changes). `text` is the same change as one plain, grammatical
 * sentence for screen readers and tooltips.
 */
export interface FeedEntry {
  /** Frame this change produces (frame 0 is the start of the day). */
  frame: number
  kind: FeedKind
  noteId: string
  time: number
  /** The note's title right after the change (before it, for a deletion). */
  title: string
  /** Plain sentence, e.g. `Moved “Report” from Todo to In Progress`. */
  text: string
  /** The note's colour right after the change. */
  color: string | null
  /** `color` changes: the colour before. */
  previousColor?: string | null
  /** `title` changes: the title before. */
  previousTitle?: string
  /** `moved`: the group it left. */
  fromGroup?: string
  /** `created` / `moved`: the group it's in now. */
  toGroup?: string
  /** `moved`: the same update automatically reset it to unchecked (On Check Move To). */
  resetOnMove?: boolean
  /** `status`: the status text. */
  statusText?: string
  /** `counter`: the value before the burst (null if unknown), and after it. */
  fromValue?: number | null
  toValue?: number
  /** `counter`: every tap in the merged burst, oldest first. */
  taps?: { time: number; value: number }[]
  /** `list`: what changed, item by item. */
  listChanges?: ListChange[]
  /** True when this change put the note into the workspace's Completed group. */
  completed: boolean
}

export interface ReplayFrame {
  time: number
  /** Column ids that exist at this frame, in current board order. */
  groupIds: string[]
  /** Notes alive at this frame: current note rows with historical fields overlaid. */
  notes: Note[]
}

export interface DayCountsDetailed {
  created: number
  moved: number
  deleted: number
  titleEdits: number
  colorChanges: number
  statuses: number
  completed: number
  checked: number
  unchecked: number
  counterChanges: number
  listChanges: number
}

export interface DayReplay {
  frames: ReplayFrame[]
  feed: FeedEntry[]
  counts: DayCountsDetailed
  groupsById: Map<string, Group>
  /** Notes that still exist *today* (not deleted), so a feed entry can open its note. */
  liveNoteIds: Set<string>
}

type Step =
  | { kind: 'event'; time: number; event: ActivityEvent }
  | { kind: 'status'; time: number; noteId: string; text: string }

interface NoteState {
  groupId: string
  title: string
  color: string | null
  alive: boolean
  /** `null` = never logged (pre-tracking history): fall back to the current row. */
  completed: boolean | null
  counter: number | null
  list: ListSnapshotItem[] | null
}

/** Item-level differences between two list snapshots. Order changes alone produce none. */
export function diffList(before: ListSnapshotItem[] | null, after: ListSnapshotItem[]): ListChange[] {
  const previous = new Map((before ?? []).map((item) => [item.id, item]))
  const changes: ListChange[] = []
  for (const item of after) {
    const old = previous.get(item.id)
    if (!old) {
      changes.push({ change: 'added', text: item.text })
      continue
    }
    if (old.text !== item.text) changes.push({ change: 'edited', text: item.text, previousText: old.text })
    if (old.completed !== item.completed) changes.push({ change: item.completed ? 'checked' : 'unchecked', text: item.text })
    previous.delete(item.id)
  }
  for (const removed of previous.values()) changes.push({ change: 'removed', text: removed.text })
  return changes
}

function describeListChange({ change, text, previousText }: ListChange): string {
  if (change === 'edited') return `renamed ${quote(previousText ?? '')} to ${quote(text)}`
  return `${change} ${quote(text)}`
}

/** Builds every frame of a day up front. `day` is any time on that local day. */
export function buildDayReplay(source: DayTimelineSource, day: Date): DayReplay {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = addDays(startOfDay(day), 1).getTime()

  const notesById = new Map(source.notes.map((n) => [n.id, n]))
  const groupsById = new Map(source.groups.map((g) => [g.id, g]))
  const groupOrder = [...source.groups].sort((a, b) => a.position - b.position).map((g) => g.id)
  const groupName = (id: string | null) => (id ? (groupsById.get(id)?.name ?? 'a deleted group') : '?')
  const isGenesis = genesisChecker(source.events)
  const intoCompleted = (groupId: string | null) => !!source.completedGroupId && groupId === source.completedGroupId

  const noteState = new Map<string, NoteState>()
  const liveGroups = new Set<string>()

  function apply(e: ActivityEvent) {
    if (e.entityType === 'group') {
      if (e.action === 'created') liveGroups.add(e.entityId)
      else if (e.action === 'deleted') liveGroups.delete(e.entityId)
      return
    }
    const current = noteState.get(e.entityId)
    if (e.action === 'created') {
      noteState.set(e.entityId, {
        groupId: e.toGroupId ?? '',
        title: '',
        color: null,
        alive: true,
        completed: null,
        counter: null,
        list: null,
      })
      return
    }
    if (!current) return
    let next: NoteState = current
    if (e.action === 'moved') next = { ...current, groupId: e.toGroupId ?? current.groupId }
    else if (e.action === 'deleted') next = { ...current, alive: false }
    else if (e.field === 'title') next = { ...current, title: e.newValue ?? '' }
    else if (e.field === 'color') next = { ...current, color: e.newValue }
    else if (e.field === 'completed') next = { ...current, completed: e.newValue === '1' }
    else if (e.field === 'counter') next = { ...current, counter: Number(e.newValue ?? 0) }
    else if (e.field === 'list') next = { ...current, list: parseList(e.newValue) }
    noteState.set(e.entityId, next)
  }

  // Fold all history before the day into the starting board.
  for (const e of source.events) {
    if (e.createdAt >= dayStart) break
    apply(e)
  }

  // The day's steps: its events plus its status entries. A stable sort keeps each
  // update's events in the order they were logged (`created` before its genesis fields,
  // `moved` before a same-update reset).
  const steps: Step[] = []
  for (const e of source.events) {
    if (e.createdAt >= dayStart && e.createdAt < dayEnd) steps.push({ kind: 'event', time: e.createdAt, event: e })
  }
  for (const note of source.notes) {
    for (const s of note.statuses) {
      if (s.createdAt >= dayStart && s.createdAt < dayEnd) {
        steps.push({ kind: 'status', time: s.createdAt, noteId: note.id, text: s.text })
      }
    }
  }
  steps.sort((a, b) => a.time - b.time)

  // Frame notes = the full current row with the historical fields overlaid, reused
  // while unchanged so consecutive frames share objects.
  const noteCache = new Map<string, { state: NoteState; statusCount: number; note: Note }>()
  function snapshot(time: number): ReplayFrame {
    const notes: Note[] = []
    for (const [id, state] of noteState) {
      if (!state.alive) continue
      const row = notesById.get(id)
      if (!row) continue
      const statuses = row.statuses.filter((s) => s.createdAt <= time)
      const cached = noteCache.get(id)
      if (cached && cached.state === state && cached.statusCount === statuses.length) {
        notes.push(cached.note)
        continue
      }
      let payload = row.payload
      if (row.type === 'counter' && state.counter !== null) {
        payload = { ...(row.payload as CounterPayload), value: state.counter }
      } else if (row.type === 'list' && state.list !== null) {
        payload = { items: state.list.map((item, position) => ({ ...item, position })) } satisfies ListPayload
      }
      const note: Note = {
        ...row,
        groupId: state.groupId,
        title: state.title,
        color: state.color,
        completed: state.completed ?? row.completed,
        payload,
        statuses,
      }
      noteCache.set(id, { state, statusCount: statuses.length, note })
      notes.push(note)
    }
    notes.sort((a, b) => a.position - b.position)
    return { time, groupIds: groupOrder.filter((g) => liveGroups.has(g)), notes }
  }

  const frames: ReplayFrame[] = [snapshot(dayStart)]
  const feed: FeedEntry[] = []
  const counts: DayCountsDetailed = {
    created: 0,
    moved: 0,
    deleted: 0,
    titleEdits: 0,
    colorChanges: 0,
    statuses: 0,
    completed: 0,
    checked: 0,
    unchecked: 0,
    counterChanges: 0,
    listChanges: 0,
  }

  function addFrame(entry: Omit<FeedEntry, 'frame'>) {
    feed.push({ ...entry, frame: frames.length })
    frames.push(snapshot(entry.time))
  }

  /** The next step, if it's an event matching `test`. */
  const nextEvent = (i: number, test: (e: ActivityEvent) => boolean) => {
    const next = steps[i + 1]
    return next?.kind === 'event' && test(next.event) ? next.event : null
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    if (step.kind === 'status') {
      const state = noteState.get(step.noteId)
      counts.statuses++
      const title = state?.title ?? ''
      addFrame({
        kind: 'status',
        noteId: step.noteId,
        time: step.time,
        title,
        text: `Added a status to ${quote(title)}: ${quote(step.text)}`,
        color: state?.color ?? null,
        statusText: step.text,
        completed: false,
      })
      continue
    }

    const e = step.event
    const before = noteState.get(e.entityId)
    apply(e)
    // Group events and stray genesis fields change state but aren't stops of their own.
    if (e.entityType !== 'note' || isGenesis(e)) continue

    // Apply a new note's genesis fields right away, so it appears fully formed.
    if (e.action === 'created') {
      let genesis: ActivityEvent | null
      while ((genesis = nextEvent(i, (n) => n.entityId === e.entityId && isGenesis(n)))) {
        apply(genesis)
        i++
      }
    }

    // Fold a same-update automatic reset into the move.
    let resetOnMove = false
    if (e.action === 'moved') {
      let reset: ActivityEvent | null
      while ((reset = nextEvent(i, (n) => n.entityId === e.entityId && n.createdAt === e.createdAt && isResetField(n)))) {
        apply(reset)
        i++
        resetOnMove = true
      }
    }

    // Merge a burst of counter taps into one change.
    const taps: { time: number; value: number }[] = []
    if (e.field === 'counter') {
      taps.push({ time: e.createdAt, value: Number(e.newValue ?? 0) })
      let tap: ActivityEvent | null
      while (
        (tap = nextEvent(
          i,
          (n) =>
            n.entityId === e.entityId &&
            n.field === 'counter' &&
            n.createdAt - taps[taps.length - 1].time <= COUNTER_MERGE_MS,
        ))
      ) {
        apply(tap)
        i++
        taps.push({ time: tap.createdAt, value: Number(tap.newValue ?? 0) })
      }
    }

    const after = noteState.get(e.entityId)
    const title = after?.title ?? before?.title ?? ''
    const time = taps.length > 0 ? taps[taps.length - 1].time : e.createdAt
    const base = { noteId: e.entityId, time, title, color: after?.color ?? null, completed: false }

    if (e.action === 'created') {
      const toGroup = groupName(e.toGroupId)
      const completed = intoCompleted(e.toGroupId)
      counts.created++
      if (completed) counts.completed++
      addFrame({ ...base, kind: 'created', toGroup, completed, text: `Created ${quote(title)} in ${toGroup}` })
    } else if (e.action === 'moved') {
      const fromGroup = groupName(e.fromGroupId)
      const toGroup = groupName(e.toGroupId)
      const completed = intoCompleted(e.toGroupId)
      counts.moved++
      if (completed) counts.completed++
      addFrame({
        ...base,
        kind: 'moved',
        fromGroup,
        toGroup,
        completed,
        resetOnMove,
        text: `Moved ${quote(title)} from ${fromGroup} to ${toGroup}${resetOnMove ? ', and reset it to unchecked' : ''}`,
      })
    } else if (e.action === 'deleted') {
      const deletedTitle = before?.title ?? ''
      counts.deleted++
      addFrame({ ...base, kind: 'deleted', title: deletedTitle, text: `Deleted ${quote(deletedTitle)}` })
    } else if (e.field === 'title') {
      const previousTitle = before?.title ?? ''
      counts.titleEdits++
      addFrame({ ...base, kind: 'title', previousTitle, text: `Renamed ${quote(previousTitle)} to ${quote(title)}` })
    } else if (e.field === 'color') {
      const previousColor = before?.color ?? null
      counts.colorChanges++
      addFrame({
        ...base,
        kind: 'color',
        previousColor,
        text:
          previousColor && base.color
            ? `Changed the color of ${quote(title)} from ${previousColor} to ${base.color}`
            : `Changed the color of ${quote(title)}`,
      })
    } else if (e.field === 'completed') {
      const checked = after?.completed === true
      counts[checked ? 'checked' : 'unchecked']++
      addFrame({ ...base, kind: checked ? 'checked' : 'unchecked', text: `${checked ? 'Checked' : 'Unchecked'} ${quote(title)}` })
    } else if (e.field === 'counter') {
      const fromValue = before?.counter ?? null
      const toValue = taps[taps.length - 1].value
      counts.counterChanges++
      const tapNote = taps.length > 1 ? ` in ${taps.length} taps` : ''
      addFrame({
        ...base,
        kind: 'counter',
        fromValue,
        toValue,
        taps,
        text:
          fromValue === null
            ? `Set the count of ${quote(title)} to ${toValue}${tapNote}`
            : `Changed the count of ${quote(title)} from ${fromValue} to ${toValue}${tapNote}`,
      })
    } else if (e.field === 'list') {
      const listChanges = diffList(before?.list ?? null, after?.list ?? [])
      // A pure reorder changes nothing visible: no entry (the new order still applies).
      if (listChanges.length === 0) continue
      counts.listChanges++
      addFrame({
        ...base,
        kind: 'list',
        listChanges,
        text: `Updated the list ${quote(title)}: ${listChanges.map(describeListChange).join(', ')}`,
      })
    }
  }

  const liveNoteIds = new Set(source.notes.filter((n) => n.deletedAt === null).map((n) => n.id))
  return { frames, feed, counts, groupsById, liveNoteIds }
}
