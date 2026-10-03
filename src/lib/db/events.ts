import { withDb } from './sqlite'
import { listAllNotesForHistory } from './notes'
import { listAllGroupsForHistory } from './groups'
import { getCompletedGroupId } from './workspaces'
import type { EventAction, EventEntity, EventField } from './eventLog'
import type { Note } from '../../types/note'
import type { Group } from '../../types/group'

/**
 * Read side of the Diary's activity log. These return **raw** rows: day bucketing,
 * replay frames and counts are pure functions in `lib/diary/replay.ts`. Local-day
 * bucketing is done in JS (date-fns), not SQL, because SQLite's `'localtime'` modifier
 * isn't reliable under sql.js/WASM on web. See `docs/feat-diary.md`.
 */

export interface ActivityEvent {
  id: string
  workspaceId: string
  entityType: EventEntity
  entityId: string
  action: EventAction
  fromGroupId: string | null
  toGroupId: string | null
  field: EventField | null
  newValue: string | null
  createdAt: number
}

interface ActivityEventRow {
  id: string
  workspace_id: string
  entity_type: EventEntity
  entity_id: string
  action: EventAction
  from_group_id: string | null
  to_group_id: string | null
  field: EventField | null
  new_value: string | null
  created_at: number
}

function rowToEvent(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    fromGroupId: row.from_group_id,
    toGroupId: row.to_group_id,
    field: row.field,
    newValue: row.new_value,
    createdAt: row.created_at,
  }
}

/** Events in `[from, to)`, oldest first. */
export function listEventsBetween(workspaceId: string, from: number, to: number): Promise<ActivityEvent[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM activity_events WHERE workspace_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at ASC, rowid ASC',
      [workspaceId, from, to],
    )
    return ((result.values ?? []) as ActivityEventRow[]).map(rowToEvent)
  })
}

/** Every event before `to`, oldest first: the full history needed to replay up to then. */
export function listEventsBefore(workspaceId: string, to: number): Promise<ActivityEvent[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM activity_events WHERE workspace_id = ? AND created_at < ? ORDER BY created_at ASC, rowid ASC',
      [workspaceId, to],
    )
    return ((result.values ?? []) as ActivityEventRow[]).map(rowToEvent)
  })
}

export interface MonthActivitySource {
  events: ActivityEvent[]
  /** Every note in the workspace (incl. deleted), for its timestamped status entries. */
  notes: Note[]
  completedGroupId: string | null
}

/** Raw material for the calendar's per-day counts over `[from, to)`. */
export async function getMonthActivity(workspaceId: string, from: number, to: number): Promise<MonthActivitySource> {
  const [events, notes, completedGroupId] = await Promise.all([
    listEventsBetween(workspaceId, from, to),
    listAllNotesForHistory(workspaceId),
    getCompletedGroupId(workspaceId),
  ])
  return { events, notes, completedGroupId }
}

export interface DayTimelineSource {
  /** Every event up to the end of the day, oldest first (the history to replay from). */
  events: ActivityEvent[]
  notes: Note[]
  groups: Group[]
  completedGroupId: string | null
}

/** Everything the day replay needs, loaded once, so scrubbing never queries SQLite. */
export async function getDayTimeline(workspaceId: string, dayEnd: number): Promise<DayTimelineSource> {
  const [events, notes, groups, completedGroupId] = await Promise.all([
    listEventsBefore(workspaceId, dayEnd),
    listAllNotesForHistory(workspaceId),
    listAllGroupsForHistory(workspaceId),
    getCompletedGroupId(workspaceId),
  ])
  return { events, notes, groups, completedGroupId }
}
