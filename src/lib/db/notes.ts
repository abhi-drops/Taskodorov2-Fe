import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { withDb } from './sqlite'
import { logEvent, logNoteCreated, trackedNoteFields, type StatusEventValue } from './eventLog'
import type { Note, NotePayload, NoteStatus, NoteType, Priority } from '../../types/note'

/** The fields the Diary log tracks, read before a write so changes can be diffed. */
interface TrackedRow {
  workspace_id: string
  group_id: string
  type: string
  title: string
  color: string | null
  completed: number
  payload: string
  statuses: string
}

async function readTrackedFields(db: SQLiteDBConnection, id: string): Promise<TrackedRow | null> {
  const { values } = await db.query(
    'SELECT workspace_id, group_id, type, title, color, completed, payload, statuses FROM notes WHERE id = ?',
    [id],
  )
  return (values?.[0] ?? null) as TrackedRow | null
}

interface NoteRow {
  id: string
  workspace_id: string
  group_id: string
  type: NoteType
  title: string
  description: string | null
  color: string | null
  priority: Priority
  position: number
  completed: number
  payload: string
  statuses: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    groupId: row.group_id,
    type: row.type,
    title: row.title,
    description: row.description,
    color: row.color,
    priority: row.priority,
    position: row.position,
    completed: row.completed === 1,
    payload: JSON.parse(row.payload) as NotePayload,
    statuses: JSON.parse(row.statuses) as NoteStatus[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function defaultPayload(type: NoteType): NotePayload {
  if (type === 'counter') return { value: 0, step: 1, target: null }
  if (type === 'list') return { items: [] }
  return {}
}

export function getNoteById(id: string): Promise<Note | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL', [id])
    const row = (result.values ?? [])[0] as NoteRow | undefined
    return row ? rowToNote(row) : null
  })
}

export function listNotesByGroup(groupId: string): Promise<Note[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM notes WHERE group_id = ? AND deleted_at IS NULL ORDER BY position ASC',
      [groupId],
    )
    return ((result.values ?? []) as NoteRow[]).map(rowToNote)
  })
}

export function listNotesByWorkspace(workspaceId: string): Promise<Note[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM notes WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY position ASC',
      [workspaceId],
    )
    return ((result.values ?? []) as NoteRow[]).map(rowToNote)
  })
}

/**
 * Every note in a workspace, **including soft-deleted ones**. Only for the Diary's
 * history replay, where a note deleted later still has to appear in earlier frames.
 */
export function listAllNotesForHistory(workspaceId: string): Promise<Note[]> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM notes WHERE workspace_id = ?', [workspaceId])
    return ((result.values ?? []) as NoteRow[]).map(rowToNote)
  })
}

export function createNote(input: {
  workspaceId: string
  groupId: string
  type: NoteType
  title: string
  description?: string | null
  color?: string | null
  priority?: Priority
  payload?: NotePayload
}): Promise<Note> {
  return withDb(async (db) => {
    const { values } = await db.query(
      'SELECT COUNT(*) as count FROM notes WHERE group_id = ? AND deleted_at IS NULL',
      [input.groupId],
    )
    const position = ((values?.[0] as { count: number } | undefined)?.count) ?? 0

    const id = crypto.randomUUID()
    const now = Date.now()
    const description = input.description ?? null
    const color = input.color ?? null
    const priority: Priority = input.priority ?? 'normal'
    const payload = input.payload ?? defaultPayload(input.type)

    await db.run(
      `INSERT INTO notes
        (id, workspace_id, group_id, type, title, description, color, priority, position, completed, payload, statuses, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '[]', ?, ?, NULL)`,
      [
        id,
        input.workspaceId,
        input.groupId,
        input.type,
        input.title,
        description,
        color,
        priority,
        position,
        JSON.stringify(payload),
        now,
        now,
      ],
    )
    await logNoteCreated(db, {
      id,
      workspaceId: input.workspaceId,
      groupId: input.groupId,
      type: input.type,
      title: input.title,
      color,
      completed: false,
      payload,
      createdAt: now,
    })

    return {
      id,
      workspaceId: input.workspaceId,
      groupId: input.groupId,
      type: input.type,
      title: input.title,
      description,
      color,
      priority,
      position,
      completed: false,
      payload,
      statuses: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
  })
}

export function updateNote(
  id: string,
  patch: Partial<
    Pick<
      Note,
      | 'title'
      | 'description'
      | 'color'
      | 'priority'
      | 'position'
      | 'completed'
      | 'payload'
      | 'statuses'
      | 'groupId'
      | 'type'
    >
  >,
): Promise<void> {
  return withDb(async (db) => {
    const setClauses: string[] = []
    const params: unknown[] = []

    if ('title' in patch) {
      setClauses.push('title = ?')
      params.push(patch.title)
    }
    if ('type' in patch) {
      setClauses.push('type = ?')
      params.push(patch.type)
    }
    if ('description' in patch) {
      setClauses.push('description = ?')
      params.push(patch.description)
    }
    if ('color' in patch) {
      setClauses.push('color = ?')
      params.push(patch.color)
    }
    if ('priority' in patch) {
      setClauses.push('priority = ?')
      params.push(patch.priority)
    }
    if ('position' in patch) {
      setClauses.push('position = ?')
      params.push(patch.position)
    }
    if ('completed' in patch) {
      setClauses.push('completed = ?')
      params.push(patch.completed ? 1 : 0)
    }
    if ('payload' in patch) {
      setClauses.push('payload = ?')
      params.push(JSON.stringify(patch.payload))
    }
    if ('statuses' in patch) {
      setClauses.push('statuses = ?')
      params.push(JSON.stringify(patch.statuses))
    }
    if ('groupId' in patch) {
      setClauses.push('group_id = ?')
      params.push(patch.groupId)
    }
    if (setClauses.length === 0) return

    // Diary: diff the tracked fields against the current row, and log only real
    // changes (no event for a no-op save). Every tracked field goes through the same
    // `trackedNoteFields` encoding as creation, so "changed" means the logged value
    // actually differs (e.g. a counter step edit doesn't log a counter change).
    const tracksChange = ['groupId', 'title', 'color', 'completed', 'payload', 'type', 'statuses'].some((k) => k in patch)
    const before = tracksChange ? await readTrackedFields(db, id) : null

    const now = Date.now()
    setClauses.push('updated_at = ?')
    params.push(now)
    params.push(id)

    await db.run(`UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`, params)

    if (before) {
      const base = { workspaceId: before.workspace_id, entityType: 'note' as const, entityId: id, createdAt: now }
      // `moved` first: the replay folds a same-timestamp automatic reset (On Check Move
      // To + reset on move) into the move instead of listing it as a separate uncheck.
      if ('groupId' in patch && patch.groupId !== undefined && patch.groupId !== before.group_id) {
        await logEvent(db, { ...base, action: 'moved', fromGroupId: before.group_id, toGroupId: patch.groupId })
      }
      const after = {
        type: patch.type ?? before.type,
        title: patch.title ?? before.title,
        color: 'color' in patch ? (patch.color ?? null) : before.color,
        completed: 'completed' in patch ? !!patch.completed : before.completed === 1,
        payload: 'payload' in patch ? patch.payload : before.payload,
      }
      const beforeValues = new Map(trackedNoteFields(before))
      for (const [field, value] of trackedNoteFields(after)) {
        if (beforeValues.get(field) !== value) {
          await logEvent(db, { ...base, action: 'field_changed', field, newValue: value })
        }
      }
      // Statuses: log edits and deletions (additions carry their own `createdAt`).
      if ('statuses' in patch && patch.statuses) {
        const previous = JSON.parse(before.statuses || '[]') as NoteStatus[]
        const next = new Map(patch.statuses.map((st) => [st.id, st]))
        for (const old of previous) {
          const updated = next.get(old.id)
          const change: StatusEventValue | null = !updated
            ? { op: 'deleted', id: old.id, text: old.text, createdAt: old.createdAt }
            : updated.text !== old.text
              ? { op: 'edited', id: old.id, text: updated.text, previousText: old.text, createdAt: old.createdAt }
              : null
          if (change) {
            await logEvent(db, { ...base, action: 'field_changed', field: 'status', newValue: JSON.stringify(change) })
          }
        }
      }
    }
  })
}

export function deleteNote(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()
    const before = await readTrackedFields(db, id)
    await db.run('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])
    if (before) {
      await logEvent(db, {
        workspaceId: before.workspace_id,
        entityType: 'note',
        entityId: id,
        action: 'deleted',
        createdAt: now,
      })
    }
  })
}

/**
 * Bulk position/group reindex for drag-and-drop drops — see docs/feat-groups.md's
 * manual sort mode. Callers pass the full new `{ id, groupId, position }` for every
 * note whose position or group actually changed (not the whole board).
 */
export function reorderNotes(updates: { id: string; groupId: string; position: number }[]): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()
    for (const update of updates) {
      // Drag-and-drop between columns comes through here, not `updateNote`, so this is
      // where a dragged move gets logged for the Diary. Same-column reorders aren't logged.
      const before = await readTrackedFields(db, update.id)
      await db.run('UPDATE notes SET group_id = ?, position = ?, updated_at = ? WHERE id = ?', [
        update.groupId,
        update.position,
        now,
        update.id,
      ])
      if (before && before.group_id !== update.groupId) {
        await logEvent(db, {
          workspaceId: before.workspace_id,
          entityType: 'note',
          entityId: update.id,
          action: 'moved',
          fromGroupId: before.group_id,
          toGroupId: update.groupId,
          createdAt: now,
        })
      }
    }
  })
}
