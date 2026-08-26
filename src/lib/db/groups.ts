import { withDb } from './sqlite'
import type { Group, NoteColorMode, SortedBy } from '../../types/group'

interface GroupRow {
  id: string
  workspace_id: string
  name: string
  position: number
  sorted_by: SortedBy
  note_color_mode: NoteColorMode
  on_check_move_to_group_id: string | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function rowToGroup(row: GroupRow): Group {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    position: row.position,
    sortedBy: row.sorted_by,
    noteColorMode: row.note_color_mode,
    onCheckMoveToGroupId: row.on_check_move_to_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function listGroups(workspaceId: string): Promise<Group[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM groups WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY position ASC',
      [workspaceId],
    )
    return ((result.values ?? []) as GroupRow[]).map(rowToGroup)
  })
}

export function createGroup(input: { workspaceId: string; name: string }): Promise<Group> {
  return withDb(async (db) => {
    const { values } = await db.query(
      'SELECT COUNT(*) as count FROM groups WHERE workspace_id = ? AND deleted_at IS NULL',
      [input.workspaceId],
    )
    const position = ((values?.[0] as { count: number } | undefined)?.count) ?? 0

    const id = crypto.randomUUID()
    const now = Date.now()
    const sortedBy: SortedBy = 'alphabetical'
    const noteColorMode: NoteColorMode = 'random'

    await db.run(
      `INSERT INTO groups
        (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
      [id, input.workspaceId, input.name, position, sortedBy, noteColorMode, now, now],
    )

    return {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      position,
      sortedBy,
      noteColorMode,
      onCheckMoveToGroupId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
  })
}

export function updateGroup(
  id: string,
  patch: Partial<Pick<Group, 'name' | 'position' | 'sortedBy' | 'noteColorMode' | 'onCheckMoveToGroupId'>>,
): Promise<void> {
  return withDb(async (db) => {
    const columns: Record<string, string> = {
      name: 'name',
      position: 'position',
      sortedBy: 'sorted_by',
      noteColorMode: 'note_color_mode',
      onCheckMoveToGroupId: 'on_check_move_to_group_id',
    }

    const setClauses: string[] = []
    const params: unknown[] = []
    for (const [key, column] of Object.entries(columns)) {
      if (key in patch) {
        setClauses.push(`${column} = ?`)
        params.push(patch[key as keyof typeof patch])
      }
    }
    if (setClauses.length === 0) return

    setClauses.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await db.run(`UPDATE groups SET ${setClauses.join(', ')} WHERE id = ?`, params)
  })
}

export function deleteGroup(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()

    await db.run('UPDATE groups SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])
    await db.run(
      'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE group_id = ? AND deleted_at IS NULL',
      [now, now, id],
    )
  })
}
