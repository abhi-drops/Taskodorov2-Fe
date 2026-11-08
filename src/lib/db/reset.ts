import { Preferences } from '@capacitor/preferences'
import { withDb, seedIfEmpty } from './sqlite'
import { seedBuiltinTemplates } from '../templates/seedBuiltins'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Hard-deletes every table sync can touch, leaving Preferences, the auth session and
 * the built-in templates untouched. Takes the raw connection so a caller can run it in
 * the same `withDb` call as whatever replaces the data next — there is never a moment
 * on disk where the database is empty. Used by `resetToDefault` below, and by the
 * `use_account` first-sync strategy (`docs/phase3-sync-plan-from-be.md` §4), which must
 * NOT use the full reset: that would also clear the session mid-sync.
 */
export async function wipeSyncedData(db: SQLiteDBConnection): Promise<void> {
  for (const table of ['notes', 'groups', 'workspaces', 'activity_events', 'sync_deleted_events']) {
    await db.run(`DELETE FROM ${table}`)
  }
  // Built-ins never sync, so the server will never send them back — deleting them here
  // would leave the Templates app empty until the next launch re-seeds them under new
  // ids. Only the user's own templates are in scope for a sync-driven wipe.
  await db.run('DELETE FROM templates WHERE builtin_id IS NULL')
}

/**
 * Settings' "Reset To Default": puts the app back to how a fresh install looks. It
 * erases **everything** stored on this device, then seeds the starting data again:
 * - the database: every workspace, group and note, the Diary's whole history, and every
 *   template (the user's own are gone; the built-in ones return in their factory form);
 * - Preferences: the signed-in session (so this also signs the user out, on this device
 *   only), the active workspace, and the add-button settings;
 * - browser storage: saved panel widths and any other `localStorage` / `sessionStorage`.
 *
 * Rows are really deleted, not soft-deleted: nothing is meant to survive this. The
 * caller reloads the page afterwards, so no in-memory state outlives it either.
 */
export async function resetToDefault(): Promise<void> {
  await withDb(async (db) => {
    await wipeSyncedData(db)
    await db.run('DELETE FROM templates')
    // A reset looks like a fresh install, so the intro and every tour show again.
    await db.run('DELETE FROM user_state')
    await seedBuiltinTemplates(db)
    await seedIfEmpty(db)
  })

  // On web, Preferences lives in localStorage; clearing both covers every platform.
  await Preferences.clear()
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storage].clear()
    } catch {
      // Blocked storage (private mode): there was nothing of ours in it to clear.
    }
  }
}
