import { Preferences } from '@capacitor/preferences'
import { withDb, seedIfEmpty } from './sqlite'
import { seedBuiltinTemplates } from '../templates/seedBuiltins'

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
    for (const table of ['notes', 'groups', 'workspaces', 'activity_events', 'templates']) {
      await db.run(`DELETE FROM ${table}`)
    }
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
