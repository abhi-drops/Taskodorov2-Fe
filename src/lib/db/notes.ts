import { withDb } from './sqlite'
import type { Note, NotePayload, NoteType, Priority } from '../../types/note'

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
        (id, workspace_id, group_id, type, title, description, color, priority, position, completed, payload, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`,
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
      'title' | 'description' | 'color' | 'priority' | 'position' | 'completed' | 'payload' | 'groupId' | 'type'
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
    if ('groupId' in patch) {
      setClauses.push('group_id = ?')
      params.push(patch.groupId)
    }
    if (setClauses.length === 0) return

    setClauses.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await db.run(`UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`, params)
  })
}

export function deleteNote(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()
    await db.run('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])
  })
}
