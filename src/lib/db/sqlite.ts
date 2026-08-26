// sql.js is pinned to 1.11.0 (package.json) to match the sql-wasm.wasm glue
// bundled inside jeep-sqlite@2.8.0 — newer sql.js wasm builds fail with
// "LinkError: ... function import requires a callable" against that glue.
// Bumping jeep-sqlite later may require re-pinning this in lockstep.
import { defineCustomElements } from 'jeep-sqlite/loader'
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'taskodoro'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  sorted_by TEXT NOT NULL DEFAULT 'alphabetical',
  note_color_mode TEXT NOT NULL DEFAULT 'random',
  on_check_move_to_group_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  position INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
`

const sqlite = new SQLiteConnection(CapacitorSQLite)

let dbPromise: Promise<SQLiteDBConnection> | null = null

async function ensureJeepSqliteElement(): Promise<void> {
  defineCustomElements(window)

  if (!document.querySelector('jeep-sqlite')) {
    const el = document.createElement('jeep-sqlite')
    document.body.appendChild(el)
  }
  await customElements.whenDefined('jeep-sqlite')
  await sqlite.initWebStore()
}

async function openConnection(): Promise<SQLiteDBConnection> {
  if (Capacitor.getPlatform() === 'web') {
    await ensureJeepSqliteElement()
  }

  await sqlite.checkConnectionsConsistency()
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result

  const db = isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await db.open()
  return db
}

export async function seedIfEmpty(db: SQLiteDBConnection): Promise<void> {
  const existing = await db.query('SELECT id FROM workspaces WHERE deleted_at IS NULL LIMIT 1')
  if (existing.values && existing.values.length > 0) return

  const now = Date.now()
  const workspaceId = crypto.randomUUID()

  await db.run(
    'INSERT INTO workspaces (id, name, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
    [workspaceId, 'Workspace 1', 0, now, now],
  )

  const defaultGroups = ['Todo', 'In Progress', 'Completed']
  for (let i = 0; i < defaultGroups.length; i++) {
    await db.run(
      `INSERT INTO groups
        (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, 'alphabetical', 'random', NULL, ?, ?, NULL)`,
      [crypto.randomUUID(), workspaceId, defaultGroups[i], i, now, now],
    )
  }
}

async function initDb(): Promise<SQLiteDBConnection> {
  const db = await openConnection()
  await db.execute(SCHEMA_SQL)
  await seedIfEmpty(db)
  return db
}

export function getDb(): Promise<SQLiteDBConnection> {
  if (!dbPromise) dbPromise = initDb()
  return dbPromise
}

// Serializes all DB access onto a single queue. The underlying plugin errors
// ("cannot start a transaction within a transaction") if two callers run
// statements concurrently on the same connection — e.g. React StrictMode's
// double-invoked effects, or two components both triggering a write around
// the same time. Every CRUD function should go through this instead of
// calling getDb() directly.
let queue: Promise<unknown> = Promise.resolve()

export function withDb<T>(fn: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const value = await fn(await getDb())
    // jeep-sqlite (web) only flushes its in-memory sql.js database to
    // IndexedDB on saveToStore()/close()/closeConnection() — the <jeep-sqlite>
    // element's `autoSave` prop is an alternative but its save-on-COMMIT
    // timing is unverified here, so this flushes explicitly and
    // deterministically after every call instead (confirmed via a real
    // same-tab reload during 2.4 verification: writes survive correctly).
    // No-ops on native, where writes are already durable immediately.
    if (Capacitor.getPlatform() === 'web') {
      try {
        await sqlite.saveToStore(DB_NAME)
      } catch (err) {
        console.error('Failed to flush SQLite database to IndexedDB:', err)
      }
    }
    return value
  })
  queue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}
