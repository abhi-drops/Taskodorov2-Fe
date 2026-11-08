import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { withDb } from './sqlite'
import { notifyLocalChange } from './localChange'
import type { UserStateRow } from '../../types/sync'

/**
 * Read/write side of the onboarding flags (`user_state`, schema in `userStateSchema.ts`).
 * One boolean per key, last-write-wins; every write marks the row dirty so `/sync` carries
 * it to the account. See `docs/feat-onboarding.md`.
 */
interface UserStateDbRow {
  key: string
  value: number
  updated_at: number
}

export function getAllFlags(): Promise<Record<string, boolean>> {
  return withDb(async (db) => {
    const result = await db.query('SELECT key, value FROM user_state')
    const flags: Record<string, boolean> = {}
    for (const row of (result.values ?? []) as UserStateDbRow[]) flags[row.key] = row.value === 1
    return flags
  })
}

export function setFlag(key: string, value: boolean): Promise<void> {
  return withDb(async (db) => {
    await db.run(
      `INSERT INTO user_state (key, value, updated_at, dirty) VALUES (?, ?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, dirty = 1`,
      [key, value ? 1 : 0, Date.now()],
    )
    notifyLocalChange()
  })
}

/** Sets several flags in one `withDb` call (the "Reset tips" action). */
export function setFlags(keys: string[], value: boolean): Promise<void> {
  if (keys.length === 0) return Promise.resolve()
  return withDb(async (db) => {
    const now = Date.now()
    for (const key of keys) {
      await db.run(
        `INSERT INTO user_state (key, value, updated_at, dirty) VALUES (?, ?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, dirty = 1`,
        [key, value ? 1 : 0, now],
      )
    }
    notifyLocalChange()
  })
}

export async function collectDirtyUserState(db: SQLiteDBConnection, limit: number): Promise<UserStateRow[]> {
  const result = await db.query('SELECT key, value, updated_at FROM user_state WHERE dirty = 1 ORDER BY updated_at ASC LIMIT ?', [
    limit,
  ])
  return ((result.values ?? []) as UserStateDbRow[]).map((row) => ({
    key: row.key,
    value: row.value === 1,
    updatedAt: row.updated_at,
  }))
}

/**
 * Writes a server-origin flag by its own key. Only wins if it is at least as new as the
 * local row, so a flag edited again while its push was in flight is not reverted by the
 * echo of the older push coming back in the same response.
 */
export async function upsertUserStateFromServer(db: SQLiteDBConnection, row: UserStateRow): Promise<void> {
  await db.run(
    `INSERT INTO user_state (key, value, updated_at, dirty) VALUES (?, ?, ?, 0)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, dirty = 0
     WHERE excluded.updated_at >= user_state.updated_at`,
    [row.key, row.value ? 1 : 0, row.updatedAt],
  )
}

export async function clearUserStateDirty(
  db: SQLiteDBConnection,
  pushed: { key: string; updatedAt: number }[],
): Promise<void> {
  for (const { key, updatedAt } of pushed) {
    await db.run('UPDATE user_state SET dirty = 0 WHERE key = ? AND updated_at = ?', [key, updatedAt])
  }
}
