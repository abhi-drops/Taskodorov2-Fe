import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Schema and one-shot migration for `user_state`, split from `userState.ts` so that
 * `sqlite.ts` can use it from `initDb` without a circular import (the same reason
 * `eventLog.ts` has no `sqlite.ts` import). See `docs/feat-onboarding.md`.
 *
 * Onboarding progress ("intro seen", "Diary tour seen", ...) is one row per flag. It lives
 * in SQLite rather than Preferences so it rides the same dirty-tracking and `/sync` path
 * as everything else and follows a Google account to a second device. Flags are plain
 * booleans, last-write-wins per key.
 */
export const USER_STATE_SQL = `
CREATE TABLE IF NOT EXISTS user_state (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0
);
`

export const INTRO_SEEN_KEY = 'intro.seen'
export const BOARD_TOUR_SEEN_KEY = 'boardTour.seen'

async function tableExists(db: SQLiteDBConnection, table: string): Promise<boolean> {
  const result = await db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [table])
  return (result.values ?? []).length > 0
}

/**
 * Called from `initDb` on every launch, **before** `seedIfEmpty`. The table not existing
 * yet while workspaces do means this install predates onboarding: it already knows the app,
 * so the intro and board tour are marked seen (not dirty: an account that has real flags of
 * its own must not be overwritten by a migration marker). A fresh install has neither, and
 * is left alone so the intro runs. Reading the DB here, rather than a Preferences marker,
 * keeps this independent of the order other providers write their own first-run markers in.
 */
export async function ensureUserState(db: SQLiteDBConnection): Promise<void> {
  const existed = await tableExists(db, 'user_state')
  await db.execute(USER_STATE_SQL)
  if (existed) return

  const workspaces = await db.query('SELECT id FROM workspaces LIMIT 1')
  if ((workspaces.values ?? []).length === 0) return
  const now = Date.now()
  for (const key of [INTRO_SEEN_KEY, BOARD_TOUR_SEEN_KEY]) {
    await db.run('INSERT OR IGNORE INTO user_state (key, value, updated_at, dirty) VALUES (?, 1, ?, 0)', [key, now])
  }
}
