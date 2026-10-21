import { withDb } from './sqlite'
import { instantiateTemplate } from '../templates/instantiate'
import { notifyLocalChange } from './localChange'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { Workspace } from '../../types/workspace'
import type { TemplateContent } from '../../types/template'

interface WorkspaceRow {
  id: string
  name: string
  position: number
  completed_group_id: string | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    completedGroupId: row.completed_group_id,
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
      'INSERT INTO workspaces (id, name, position, created_at, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, ?, NULL, 1)',
      [id, input.name, position, now, now],
    )
    notifyLocalChange()

    return { id, name: input.name, position, completedGroupId: null, createdAt: now, updatedAt: now, deletedAt: null }
  })
}

/**
 * Creates a workspace from a stored template (its groups, settings and sample notes) in
 * one write. Returns the new workspace's id, or `null` if the template no longer exists.
 */
export function createWorkspaceFromTemplate(input: { name: string; templateId: string }): Promise<string | null> {
  return withDb(async (db) => {
    const { values } = await db.query('SELECT content FROM templates WHERE id = ? AND deleted_at IS NULL', [
      input.templateId,
    ])
    const row = values?.[0] as { content: string } | undefined
    if (!row) return null
    const workspaceId = await instantiateTemplate(db, JSON.parse(row.content) as TemplateContent, input.name)
    notifyLocalChange()
    return workspaceId
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
    await db.run('UPDATE workspaces SET completed_group_id = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
      groupId,
      Date.now(),
      workspaceId,
    ])
    notifyLocalChange()
  })
}

export function renameWorkspace(id: string, name: string): Promise<void> {
  return withDb(async (db) => {
    await db.run('UPDATE workspaces SET name = ?, updated_at = ?, dirty = 1 WHERE id = ?', [name, Date.now(), id])
    notifyLocalChange()
  })
}

export function deleteWorkspace(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()

    await db.run('UPDATE workspaces SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', [now, now, id])

    const { values } = await db.query(
      'SELECT id FROM groups WHERE workspace_id = ? AND deleted_at IS NULL',
      [id],
    )
    const groupIds = ((values ?? []) as { id: string }[]).map((row) => row.id)

    await db.run(
      'UPDATE groups SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE workspace_id = ? AND deleted_at IS NULL',
      [now, now, id],
    )

    for (const groupId of groupIds) {
      await db.run(
        'UPDATE notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE group_id = ? AND deleted_at IS NULL',
        [now, now, groupId],
      )
    }
    notifyLocalChange()
  })
}

// --- Sync (Phase 3) ---

/** Rows changed locally since the last successful push. */
export async function collectDirtyWorkspaces(db: SQLiteDBConnection, limit: number): Promise<Workspace[]> {
  const result = await db.query('SELECT * FROM workspaces WHERE dirty = 1 ORDER BY updated_at ASC LIMIT ?', [limit])
  return ((result.values ?? []) as WorkspaceRow[]).map(rowToWorkspace)
}

/**
 * Mirror of `rowToWorkspace`: writes a server-origin row by its own id. `position` is
 * taken verbatim from the server — never recomputed via the `SELECT COUNT(*)` scheme
 * `createWorkspace` uses, which would renumber every pulled row.
 */
export async function upsertWorkspaceFromServer(db: SQLiteDBConnection, row: Workspace): Promise<void> {
  await db.run(
    `INSERT INTO workspaces (id, name, position, completed_group_id, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       position = excluded.position,
       completed_group_id = excluded.completed_group_id,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       dirty = 0`,
    [row.id, row.name, row.position, row.completedGroupId, row.createdAt, row.updatedAt, row.deletedAt],
  )
}

/** Clears `dirty` for rows pushed successfully, unless edited again meanwhile (same row,
 *  new `updated_at`) — clock-free, by equality rather than comparison. */
export async function clearWorkspaceDirty(
  db: SQLiteDBConnection,
  pushed: { id: string; updatedAt: number }[],
): Promise<void> {
  for (const { id, updatedAt } of pushed) {
    await db.run('UPDATE workspaces SET dirty = 0 WHERE id = ? AND updated_at = ?', [id, updatedAt])
  }
}
