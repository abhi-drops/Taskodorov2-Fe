import { withDb } from './sqlite'
import { logEvent, logGroupCreated } from './eventLog'
import { notifyLocalChange } from './localChange'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { Group, HideAfterMode, HideAfterUnit, NoteColorMode, SortedBy } from '../../types/group'

interface GroupRow {
  id: string
  workspace_id: string
  name: string
  position: number
  sorted_by: SortedBy
  note_color_mode: NoteColorMode
  on_check_move_to_group_id: string | null
  reset_on_move: number
  hide_after_mode: HideAfterMode
  hide_after_amount: number
  hide_after_unit: HideAfterUnit
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
    resetOnMove: row.reset_on_move === 1,
    hideAfterMode: row.hide_after_mode,
    hideAfterAmount: row.hide_after_amount,
    hideAfterUnit: row.hide_after_unit,
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

/**
 * Every group in a workspace, **including soft-deleted ones**, in board order. Only for
 * the Diary's history replay, where a group deleted later still has to appear as a
 * column in earlier frames.
 */
export function listAllGroupsForHistory(workspaceId: string): Promise<Group[]> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM groups WHERE workspace_id = ? ORDER BY position ASC', [
      workspaceId,
    ])
    return ((result.values ?? []) as GroupRow[]).map(rowToGroup)
  })
}

export function getGroupById(id: string): Promise<Group | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM groups WHERE id = ? AND deleted_at IS NULL', [id])
    const row = (result.values ?? [])[0] as GroupRow | undefined
    return row ? rowToGroup(row) : null
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
    const sortedBy: SortedBy = 'manual'
    const noteColorMode: NoteColorMode = 'manual'

    await db.run(
      `INSERT INTO groups
        (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, created_at, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 1)`,
      [id, input.workspaceId, input.name, position, sortedBy, noteColorMode, now, now],
    )
    await logGroupCreated(db, { id, workspaceId: input.workspaceId, createdAt: now })
    notifyLocalChange()

    return {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      position,
      sortedBy,
      noteColorMode,
      onCheckMoveToGroupId: null,
      resetOnMove: true,
      hideAfterMode: 'never',
      hideAfterAmount: 1,
      hideAfterUnit: 'days',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
  })
}

export function updateGroup(
  id: string,
  patch: Partial<
    Pick<
      Group,
      | 'name'
      | 'position'
      | 'sortedBy'
      | 'noteColorMode'
      | 'onCheckMoveToGroupId'
      | 'resetOnMove'
      | 'hideAfterMode'
      | 'hideAfterAmount'
      | 'hideAfterUnit'
    >
  >,
): Promise<void> {
  return withDb(async (db) => {
    const columns: Record<string, string> = {
      name: 'name',
      position: 'position',
      sortedBy: 'sorted_by',
      noteColorMode: 'note_color_mode',
      onCheckMoveToGroupId: 'on_check_move_to_group_id',
      hideAfterMode: 'hide_after_mode',
      hideAfterAmount: 'hide_after_amount',
      hideAfterUnit: 'hide_after_unit',
    }

    const setClauses: string[] = []
    const params: unknown[] = []
    for (const [key, column] of Object.entries(columns)) {
      if (key in patch) {
        setClauses.push(`${column} = ?`)
        params.push(patch[key as keyof typeof patch])
      }
    }
    if ('resetOnMove' in patch) {
      setClauses.push('reset_on_move = ?')
      params.push(patch.resetOnMove ? 1 : 0)
    }
    if (setClauses.length === 0) return

    setClauses.push('updated_at = ?', 'dirty = 1')
    params.push(Date.now())
    params.push(id)

    await db.run(`UPDATE groups SET ${setClauses.join(', ')} WHERE id = ?`, params)
    notifyLocalChange()
  })
}

/** Bulk position reindex for drag-and-drop column/tab reordering. */
export function reorderGroups(updates: { id: string; position: number }[]): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()
    for (const update of updates) {
      await db.run('UPDATE groups SET position = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
        update.position,
        now,
        update.id,
      ])
    }
    notifyLocalChange()
  })
}

export function deleteGroup(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()

    // Diary: the cascade deletes the group's live notes too, so each gets its own
    // `deleted` event. Read them before they're soft-deleted.
    const groupRow = ((await db.query('SELECT workspace_id FROM groups WHERE id = ?', [id])).values ?? [])[0] as
      | { workspace_id: string }
      | undefined
    const liveNotes = ((await db.query('SELECT id FROM notes WHERE group_id = ? AND deleted_at IS NULL', [id]))
      .values ?? []) as { id: string }[]

    await db.run('UPDATE groups SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', [now, now, id])
    await db.run(
      'UPDATE notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE group_id = ? AND deleted_at IS NULL',
      [now, now, id],
    )

    if (groupRow) {
      const workspaceId = groupRow.workspace_id
      for (const note of liveNotes) {
        await logEvent(db, { workspaceId, entityType: 'note', entityId: note.id, action: 'deleted', createdAt: now })
      }
      await logEvent(db, { workspaceId, entityType: 'group', entityId: id, action: 'deleted', createdAt: now })
    }
    notifyLocalChange()
  })
}

// --- Sync (Phase 3) ---

export async function collectDirtyGroups(db: SQLiteDBConnection, limit: number): Promise<Group[]> {
  const result = await db.query('SELECT * FROM groups WHERE dirty = 1 ORDER BY updated_at ASC LIMIT ?', [limit])
  return ((result.values ?? []) as GroupRow[]).map(rowToGroup)
}

/**
 * Mirror of `rowToGroup`: writes a server-origin row by its own id, `position` verbatim.
 * The hide-after settings are `COALESCE`d against the local row because a backend that
 * predates them returns groups without those fields — a pull must not reset a setting
 * this device (or a newer backend) already holds.
 */
export async function upsertGroupFromServer(db: SQLiteDBConnection, row: Group): Promise<void> {
  await db.run(
    `INSERT INTO groups
      (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, reset_on_move, hide_after_mode, hide_after_amount, hide_after_unit, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'never'), COALESCE(?, 1), COALESCE(?, 'days'), ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       workspace_id = excluded.workspace_id,
       name = excluded.name,
       position = excluded.position,
       sorted_by = excluded.sorted_by,
       note_color_mode = excluded.note_color_mode,
       on_check_move_to_group_id = excluded.on_check_move_to_group_id,
       reset_on_move = excluded.reset_on_move,
       hide_after_mode = COALESCE(?, groups.hide_after_mode),
       hide_after_amount = COALESCE(?, groups.hide_after_amount),
       hide_after_unit = COALESCE(?, groups.hide_after_unit),
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       dirty = 0`,
    [
      row.id,
      row.workspaceId,
      row.name,
      row.position,
      row.sortedBy,
      row.noteColorMode,
      row.onCheckMoveToGroupId,
      row.resetOnMove ? 1 : 0,
      row.hideAfterMode ?? null,
      row.hideAfterAmount ?? null,
      row.hideAfterUnit ?? null,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
      row.hideAfterMode ?? null,
      row.hideAfterAmount ?? null,
      row.hideAfterUnit ?? null,
    ],
  )
}

export async function clearGroupDirty(
  db: SQLiteDBConnection,
  pushed: { id: string; updatedAt: number }[],
): Promise<void> {
  for (const { id, updatedAt } of pushed) {
    await db.run('UPDATE groups SET dirty = 0 WHERE id = ? AND updated_at = ?', [id, updatedAt])
  }
}
