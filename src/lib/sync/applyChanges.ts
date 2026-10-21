import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { upsertWorkspaceFromServer } from '../db/workspaces'
import { upsertGroupFromServer } from '../db/groups'
import { upsertNoteFromServer } from '../db/notes'
import { upsertTemplateFromServer } from '../db/templates'
import { upsertActivityEventFromServer, deleteActivityEventFromServer } from '../db/eventLog'
import type { SyncChanges } from '../../types/sync'

/**
 * Writes a pulled `changes` payload into SQLite. Takes the raw connection — call this
 * from inside one outer `withDb`, never nested (mirrors `instantiateTemplate`'s
 * pattern; see docs/feat-offline-data-layer.md). Order matches the server's own
 * dependency order: workspaces before groups before notes/templates, and the
 * activity-event hard-deletes last and separately, since that table has no tombstone
 * row to carry a deletion the way every other table does.
 *
 * No local cascades are re-run here (e.g. no `deleteGroup` call for a soft-deleted
 * group) — the server already sends the cascaded tombstones as ordinary rows, and
 * `upsert*FromServer` functions never call into `eventLog.ts`, since the server already
 * sent the real activity events for whatever changed.
 *
 * Returns true if anything was actually written, so callers know whether to signal a
 * UI refresh.
 */
export async function applyPulledChanges(db: SQLiteDBConnection, changes: SyncChanges): Promise<boolean> {
  let wrote = false

  for (const row of changes.workspaces) {
    await upsertWorkspaceFromServer(db, row)
    wrote = true
  }
  for (const row of changes.groups) {
    await upsertGroupFromServer(db, row)
    wrote = true
  }
  for (const row of changes.notes) {
    await upsertNoteFromServer(db, row)
    wrote = true
  }
  for (const row of changes.templates) {
    // Defensive: the server never sends built-ins, but never let a wire row claim
    // factory status if it somehow did.
    if (row.builtinId) continue
    await upsertTemplateFromServer(db, row)
    wrote = true
  }
  for (const row of changes.activityEvents.upserts) {
    await upsertActivityEventFromServer(db, row)
    wrote = true
  }
  for (const id of changes.activityEvents.deletes) {
    await deleteActivityEventFromServer(db, id)
    wrote = true
  }

  return wrote
}
