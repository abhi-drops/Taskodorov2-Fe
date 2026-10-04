import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Write side of the Diary's activity log (`activity_events`). Append-only, with one
 * exception: a run of title or status-text edits is kept as one event (see
 * `logTitleEdit` / `logStatusEdit`). Every helper
 * takes an already-open `db`, so callers log **inside the same `withDb` call** as the
 * write they describe, and the log can't drift from the data. Read queries live in
 * `events.ts`; this file has no `sqlite.ts` import, so `sqlite.ts` can use it for
 * seeding and backfill without a circular import. See `docs/feat-diary.md`.
 *
 * Vocabulary (deliberately narrow, per `phase2-apps-diary-plan.md`):
 * - `created` / `deleted` for notes and groups (`to_group_id` = a note's group on create);
 * - `moved` for a note changing group (`from_group_id` → `to_group_id`);
 * - `field_changed` for a note's tracked fields, with the value after the change
 *   (encoded by `trackedNoteFields`):
 *   - `title`, `color`;
 *   - `completed`: `'1'`/`'0'` (checked/unchecked);
 *   - `counter`: the counter's value (counter notes);
 *   - `list`: a JSON snapshot of the items `[{ id, text, completed }]` (list notes), so
 *     any past state can be rebuilt and two snapshots diffed into "checked X, added Y".
 *   - `status`: a status **edit or deletion** (`StatusEventValue` JSON). Adding a status
 *     isn't logged: each status already carries its own `createdAt`. Without these two,
 *     deleting a status would erase it from history, and editing one would rewrite
 *     the past with the new text.
 *   Description, priority and counter step/target are not logged.
 *
 * A note's creation also logs every tracked field's starting value, at the same
 * timestamp as `created`. These are the **genesis** values that make "X as of time T" a
 * single lookup. They are not user edits: see `genesisChecker` in `lib/diary/replay.ts`.
 * Status entries are read from `notes.statuses`, which already carries timestamps.
 */

export type EventEntity = 'note' | 'group'
export type EventAction = 'created' | 'moved' | 'deleted' | 'field_changed'
export type EventField = 'title' | 'color' | 'completed' | 'counter' | 'list' | 'status'

/**
 * `new_value` of a `status` event: one status edited or deleted. `createdAt` is the
 * status's own creation time, so a deleted status can still be placed in history.
 */
export interface StatusEventValue {
  op: 'edited' | 'deleted'
  id: string
  /** Edited: the new text. Deleted: its text at deletion. */
  text: string
  /** Edited: the text before. */
  previousText?: string
  createdAt: number
}

/** The minimal list item shape kept in a `list` snapshot. */
export interface ListSnapshotItem {
  id: string
  text: string
  completed: boolean
}

/**
 * A note's tracked fields as `[field, encoded value]` pairs: the single source of truth
 * for what's logged (on create, update, backfill and catch-up) and how it's encoded.
 * `payload` may be the parsed object or the raw JSON string from a row.
 */
export function trackedNoteFields(note: {
  type: string
  title: string
  color: string | null
  completed: boolean | number
  payload: unknown
}): [EventField, string | null][] {
  const fields: [EventField, string | null][] = [
    ['title', note.title],
    ['color', note.color],
    ['completed', note.completed === true || note.completed === 1 ? '1' : '0'],
  ]
  const payload = (typeof note.payload === 'string' ? safeParse(note.payload) : note.payload) as
    | { value?: number; items?: ListSnapshotItem[] }
    | null
  if (note.type === 'counter') fields.push(['counter', String(payload?.value ?? 0)])
  if (note.type === 'list') {
    const items = (payload?.items ?? []).map(({ id, text, completed }) => ({ id, text, completed: !!completed }))
    fields.push(['list', JSON.stringify(items)])
  }
  return fields
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

export interface ActivityEventInput {
  workspaceId: string
  entityType: EventEntity
  entityId: string
  action: EventAction
  fromGroupId?: string | null
  toGroupId?: string | null
  field?: EventField | null
  newValue?: string | null
  createdAt: number
}

export const ACTIVITY_EVENTS_SQL = `
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_group_id TEXT,
  to_group_id TEXT,
  field TEXT,
  new_value TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_workspace_time ON activity_events (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_entity_field_time ON activity_events (entity_id, field, created_at);
`

export async function logEvent(db: SQLiteDBConnection, e: ActivityEventInput): Promise<void> {
  await db.run(
    `INSERT INTO activity_events
      (id, workspace_id, entity_type, entity_id, action, from_group_id, to_group_id, field, new_value, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      e.workspaceId,
      e.entityType,
      e.entityId,
      e.action,
      e.fromGroupId ?? null,
      e.toGroupId ?? null,
      e.field ?? null,
      e.newValue ?? null,
      e.createdAt,
    ],
  )
}

/**
 * The note editor saves while typing (debounced), so one edit arrives as several saves.
 * Title or status-text edits to the same note closer together than this, with no other
 * event on that note in between, are kept as **one** event: the earlier one is updated
 * in place (new value, new time) and no row is added.
 */
export const EDIT_COALESCE_MS = 3 * 60_000

type EditBase = Pick<ActivityEventInput, 'workspaceId' | 'entityType' | 'entityId' | 'createdAt'>

/**
 * The note's latest event, if it is a `field` edit recent enough to be continued by an
 * edit at `now`. Genesis values (logged with `created`) are never continued: they are
 * the note's starting state, not an edit.
 */
async function continuableEdit(
  db: SQLiteDBConnection,
  entityId: string,
  field: EventField,
  now: number,
): Promise<{ id: string; new_value: string | null } | null> {
  const { values } = await db.query(
    `SELECT id, action, field, new_value, created_at FROM activity_events
     WHERE entity_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    [entityId],
  )
  const last = values?.[0] as
    | { id: string; action: string; field: string | null; new_value: string | null; created_at: number }
    | undefined
  if (!last || last.action !== 'field_changed' || last.field !== field) return null
  if (now - last.created_at > EDIT_COALESCE_MS) return null
  const genesis = await db.query(
    `SELECT id FROM activity_events WHERE entity_id = ? AND action = 'created' AND created_at = ? LIMIT 1`,
    [entityId, last.created_at],
  )
  if (genesis.values && genesis.values.length > 0) return null
  return last
}

/** Logs a title change, continuing the previous title edit if it is recent (`EDIT_COALESCE_MS`). */
export async function logTitleEdit(db: SQLiteDBConnection, base: EditBase, title: string): Promise<void> {
  const last = await continuableEdit(db, base.entityId, 'title', base.createdAt)
  if (!last) {
    await logEvent(db, { ...base, action: 'field_changed', field: 'title', newValue: title })
    return
  }
  // The title before this run of edits. Typing back to it means nothing changed, so
  // the run's event is dropped instead of reading "renamed X to X".
  const { values } = await db.query(
    `SELECT new_value FROM activity_events WHERE entity_id = ? AND field = 'title' AND id != ?
     ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    [base.entityId, last.id],
  )
  const original = values?.[0] as { new_value: string | null } | undefined
  if (original && original.new_value === title) {
    await db.run('DELETE FROM activity_events WHERE id = ?', [last.id])
    return
  }
  await db.run('UPDATE activity_events SET new_value = ?, created_at = ? WHERE id = ?', [title, base.createdAt, last.id])
}

/**
 * Logs a status text edit, continuing the previous edit of the **same status** if it is
 * recent (`EDIT_COALESCE_MS`). The continued event keeps its original `previousText`.
 */
export async function logStatusEdit(db: SQLiteDBConnection, base: EditBase, change: StatusEventValue): Promise<void> {
  const last = await continuableEdit(db, base.entityId, 'status', base.createdAt)
  const previous = last ? (safeParse(last.new_value ?? '') as StatusEventValue | null) : null
  if (!last || !previous || previous.op !== 'edited' || previous.id !== change.id) {
    await logEvent(db, { ...base, action: 'field_changed', field: 'status', newValue: JSON.stringify(change) })
    return
  }
  if (previous.previousText === change.text) {
    await db.run('DELETE FROM activity_events WHERE id = ?', [last.id])
    return
  }
  await db.run('UPDATE activity_events SET new_value = ?, created_at = ? WHERE id = ?', [
    JSON.stringify({ ...previous, text: change.text }),
    base.createdAt,
    last.id,
  ])
}

/** `created` plus the genesis value of every tracked field, all at `createdAt`. */
export async function logNoteCreated(
  db: SQLiteDBConnection,
  note: {
    id: string
    workspaceId: string
    groupId: string
    type: string
    title: string
    color: string | null
    completed: boolean | number
    payload: unknown
    createdAt: number
  },
): Promise<void> {
  const base = { workspaceId: note.workspaceId, entityType: 'note' as const, entityId: note.id, createdAt: note.createdAt }
  await logEvent(db, { ...base, action: 'created', toGroupId: note.groupId })
  for (const [field, newValue] of trackedNoteFields(note)) {
    await logEvent(db, { ...base, action: 'field_changed', field, newValue })
  }
}

export async function logGroupCreated(
  db: SQLiteDBConnection,
  group: { id: string; workspaceId: string; createdAt: number },
): Promise<void> {
  await logEvent(db, {
    workspaceId: group.workspaceId,
    entityType: 'group',
    entityId: group.id,
    action: 'created',
    createdAt: group.createdAt,
  })
}

/**
 * One-time seeding of the log from existing data, so past days aren't empty when Diary
 * first ships. Runs only while `activity_events` is empty, so it's idempotent and safe
 * to call on every start-up.
 *
 * For each note (including soft-deleted ones): `created` at its `created_at` in its
 * *current* group, genesis title and colour from its *current* values, and `deleted` at
 * `deleted_at` if set. Groups get `created`/`deleted` the same way. **Limitation:** past
 * moves and renames were never recorded, so they can't be reconstructed; old days show
 * creations, deletions and statuses only.
 */
export async function backfillEventsIfEmpty(db: SQLiteDBConnection): Promise<void> {
  const existing = await db.query('SELECT id FROM activity_events LIMIT 1')
  if (existing.values && existing.values.length > 0) return

  const groups = ((await db.query('SELECT id, workspace_id, created_at, deleted_at FROM groups')).values ??
    []) as { id: string; workspace_id: string; created_at: number; deleted_at: number | null }[]
  for (const g of groups) {
    await logGroupCreated(db, { id: g.id, workspaceId: g.workspace_id, createdAt: g.created_at })
    if (g.deleted_at !== null) {
      await logEvent(db, {
        workspaceId: g.workspace_id,
        entityType: 'group',
        entityId: g.id,
        action: 'deleted',
        createdAt: g.deleted_at,
      })
    }
  }

  const notes = ((
    await db.query(
      'SELECT id, workspace_id, group_id, type, title, color, completed, payload, created_at, deleted_at FROM notes',
    )
  ).values ?? []) as NoteHistoryRow[]
  for (const n of notes) {
    await logNoteCreated(db, {
      id: n.id,
      workspaceId: n.workspace_id,
      groupId: n.group_id,
      type: n.type,
      title: n.title,
      color: n.color,
      completed: n.completed,
      payload: n.payload,
      createdAt: n.created_at,
    })
    if (n.deleted_at !== null) {
      await logEvent(db, {
        workspaceId: n.workspace_id,
        entityType: 'note',
        entityId: n.id,
        action: 'deleted',
        createdAt: n.deleted_at,
      })
    }
  }
}

interface NoteHistoryRow {
  id: string
  workspace_id: string
  group_id: string
  type: string
  title: string
  color: string | null
  completed: number
  payload: string
  created_at: number
  deleted_at: number | null
}

/**
 * One-time catch-up for logs that predate tracking `completed`/`counter`/`list`: gives
 * every note with no `completed` history a genesis value for those fields, using its
 * *current* state, at its creation time.
 *
 * - At creation time, so they count as genesis (not edits), and nothing shows up as a
 *   fake change in today's calendar.
 * - Without them, the first real change after this update would have no "from" value
 *   (a counter would show "→ 8" instead of "3 → 8").
 *
 * Idempotent: notes that already have `completed` history are skipped, so it's safe to
 * run on every start-up.
 */
export async function backfillTrackedStateIfMissing(db: SQLiteDBConnection): Promise<void> {
  const tracked = new Set(
    (
      ((await db.query("SELECT DISTINCT entity_id FROM activity_events WHERE field = 'completed'")).values ??
        []) as { entity_id: string }[]
    ).map((r) => r.entity_id),
  )
  const notes = ((
    await db.query('SELECT id, workspace_id, group_id, type, title, color, completed, payload, created_at, deleted_at FROM notes')
  ).values ?? []) as NoteHistoryRow[]

  for (const n of notes) {
    if (tracked.has(n.id)) continue
    for (const [field, newValue] of trackedNoteFields(n)) {
      if (field === 'title' || field === 'color') continue // already logged
      await logEvent(db, {
        workspaceId: n.workspace_id,
        entityType: 'note',
        entityId: n.id,
        action: 'field_changed',
        field,
        newValue,
        createdAt: n.created_at,
      })
    }
  }
}
