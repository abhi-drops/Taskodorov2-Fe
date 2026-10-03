import { withDb } from './sqlite'
import type { Workspace } from '../../types/workspace'

interface WorkspaceRow {
  id: string
  name: string
  position: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function listWorkspaces(): Promise<Workspace[]> {
  return withDb(async (db) => {
    const result = await db.query(
      'SELECT * FROM workspaces WHERE deleted_at IS NULL ORDER BY position ASC',
    )
    return ((result.values ?? []) as WorkspaceRow[]).map(rowToWorkspace)
  })
}

export function createWorkspace(input: { name: string }): Promise<Workspace> {
  return withDb(async (db) => {
    const { values } = await db.query(
      'SELECT COUNT(*) as count FROM workspaces WHERE deleted_at IS NULL',
    )
    const position = ((values?.[0] as { count: number } | undefined)?.count) ?? 0

    const id = crypto.randomUUID()
    const now = Date.now()
    await db.run(
      'INSERT INTO workspaces (id, name, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
      [id, input.name, position, now, now],
    )

    return { id, name: input.name, position, createdAt: now, updatedAt: now, deletedAt: null }
  })
}

/**
 * The workspace's "Completed Group" (Diary 2.8): moves or creations into it count as
 * "Completed" in the Diary. `null` when unset, which means a Completed count of 0, with
 * no fallback guessing.
 */
export function getCompletedGroupId(workspaceId: string): Promise<string | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT completed_group_id FROM workspaces WHERE id = ?', [workspaceId])
    const row = (result.values ?? [])[0] as { completed_group_id: string | null } | undefined
    return row?.completed_group_id ?? null
  })
}

export function setCompletedGroupId(workspaceId: string, groupId: string | null): Promise<void> {
  return withDb(async (db) => {
    await db.run('UPDATE workspaces SET completed_group_id = ?, updated_at = ? WHERE id = ?', [
      groupId,
      Date.now(),
      workspaceId,
    ])
  })
}

export function renameWorkspace(id: string, name: string): Promise<void> {
  return withDb(async (db) => {
    await db.run('UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id])
  })
}

export function deleteWorkspace(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()

    await db.run('UPDATE workspaces SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    const { values } = await db.query(
      'SELECT id FROM groups WHERE workspace_id = ? AND deleted_at IS NULL',
      [id],
    )
    const groupIds = ((values ?? []) as { id: string }[]).map((row) => row.id)

    await db.run(
      'UPDATE groups SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL',
      [now, now, id],
    )

    for (const groupId of groupIds) {
      await db.run(
        'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE group_id = ? AND deleted_at IS NULL',
        [now, now, groupId],
      )
    }
  })
}
