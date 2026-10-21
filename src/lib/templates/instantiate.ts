import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { logGroupCreated, logNoteCreated } from '../db/eventLog'
import type { NotePayload } from '../../types/note'
import type { TemplateContent, TemplateNote } from '../../types/template'

/** The payload a sample note starts with: counters at 0, list items unchecked. */
export function templateNotePayload(note: TemplateNote): NotePayload {
  if (note.type === 'counter') return { value: 0, step: note.counterStep, target: note.counterTarget }
  if (note.type === 'list') {
    return {
      items: note.listItems
        .filter((text) => text.trim() !== '')
        .map((text, position) => ({ id: crypto.randomUUID(), text, completed: false, position })),
    }
  }
  return {}
}

/**
 * Creates a workspace from a template: the workspace row, its groups with their
 * settings, the Completed group and the sample notes, all with fresh ids.
 *
 * Takes the raw connection, so it **must** be called from inside one `withDb` callback
 * (it is one logical write). It must not call `createGroup`/`createNote`: those queue
 * behind the very callback that would be awaiting them.
 *
 * Every row is logged for the Diary here, not left to the backfill, which only runs
 * while the activity log is empty.
 */
export async function instantiateTemplate(
  db: SQLiteDBConnection,
  content: TemplateContent,
  workspaceName: string,
): Promise<string> {
  const now = Date.now()
  const workspaceId = crypto.randomUUID()

  const { values } = await db.query('SELECT COUNT(*) as count FROM workspaces WHERE deleted_at IS NULL')
  const position = (values?.[0] as { count: number } | undefined)?.count ?? 0

  await db.run(
    'INSERT INTO workspaces (id, name, position, created_at, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, ?, NULL, 1)',
    [workspaceId, workspaceName, position, now, now],
  )

  // All group ids first: a group's "On Check Move To" may point at a later group.
  const groupIds = new Map(content.groups.map((group) => [group.key, crypto.randomUUID()]))

  for (let i = 0; i < content.groups.length; i++) {
    const group = content.groups[i]
    const groupId = groupIds.get(group.key)!
    const moveTo = group.onCheckMoveToKey ? (groupIds.get(group.onCheckMoveToKey) ?? null) : null
    await db.run(
      `INSERT INTO groups
        (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, reset_on_move, created_at, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [groupId, workspaceId, group.name, i, group.sortedBy, group.noteColorMode, moveTo, group.resetOnMove ? 1 : 0, now, now],
    )
    await logGroupCreated(db, { id: groupId, workspaceId, createdAt: now })
  }

  // `migrateSchema()` has already added the column by the time any template is used.
  const completedGroupId = content.completedGroupKey ? (groupIds.get(content.completedGroupKey) ?? null) : null
  if (completedGroupId) {
    await db.run('UPDATE workspaces SET completed_group_id = ?, dirty = 1 WHERE id = ?', [completedGroupId, workspaceId])
  }

  for (const group of content.groups) {
    const groupId = groupIds.get(group.key)!
    for (let i = 0; i < group.notes.length; i++) {
      const note = group.notes[i]
      const noteId = crypto.randomUUID()
      const payload = templateNotePayload(note)
      await db.run(
        `INSERT INTO notes
          (id, workspace_id, group_id, type, title, description, color, priority, position, completed, payload, created_at, updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, 1)`,
        [
          noteId,
          workspaceId,
          groupId,
          note.type,
          note.title,
          note.description,
          note.color,
          note.priority,
          i,
          JSON.stringify(payload),
          now,
          now,
        ],
      )
      await logNoteCreated(db, {
        id: noteId,
        workspaceId,
        groupId,
        type: note.type,
        title: note.title,
        color: note.color,
        completed: false,
        payload,
        createdAt: now,
        seeded: true,
      })
    }
  }

  return workspaceId
}
