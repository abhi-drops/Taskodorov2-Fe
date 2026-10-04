// sql.js is pinned to 1.11.0 (package.json) to match the sql-wasm.wasm glue
// bundled inside jeep-sqlite@2.8.0 — newer sql.js wasm builds fail with
// "LinkError: ... function import requires a callable" against that glue.
// Bumping jeep-sqlite later may require re-pinning this in lockstep.
import { defineCustomElements } from 'jeep-sqlite/loader'
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
  ACTIVITY_EVENTS_SQL,
  backfillEventsIfEmpty,
  backfillTrackedStateIfMissing,
} from './eventLog'
import { DEFAULT_TEMPLATE_CONTENT } from '../templates/builtins'
import { instantiateTemplate } from '../templates/instantiate'
import { TEMPLATES_SQL, seedBuiltinTemplates } from '../templates/seedBuiltins'

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
  sorted_by TEXT NOT NULL DEFAULT 'manual',
  note_color_mode TEXT NOT NULL DEFAULT 'manual',
  on_check_move_to_group_id TEXT,
  reset_on_move INTEGER NOT NULL DEFAULT 1,
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
  statuses TEXT NOT NULL DEFAULT '[]',
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

  // Always the factory Default (not the user's edited copy in `templates`), so first
  // launch and "Reset to Default" give the same board. It logs its own Diary events:
  // after a reset the activity log is no longer empty, so the backfill wouldn't.
  await instantiateTemplate(db, DEFAULT_TEMPLATE_CONTENT, 'Workspace 1')
}

/**
 * `SCHEMA_SQL` is `CREATE TABLE IF NOT EXISTS` only — there's no schema-version
 * tracking, so it's a no-op for a column added to an existing table on an install that
 * already has one from before. New columns need an explicit, idempotent `ALTER TABLE`
 * step here (SQLite has no `ADD COLUMN IF NOT EXISTS`, hence the `PRAGMA table_info`
 * existence check) so already-created local databases pick them up too.
 */
async function ensureColumn(
  db: SQLiteDBConnection,
  table: string,
  column: string,
  addColumnSql: string,
): Promise<void> {
  const result = await db.query(`PRAGMA table_info(${table})`)
  const hasColumn = ((result.values ?? []) as { name: string }[]).some((c) => c.name === column)
  if (!hasColumn) await db.execute(addColumnSql)
}

async function migrateSchema(db: SQLiteDBConnection): Promise<void> {
  await ensureColumn(
    db,
    'groups',
    'reset_on_move',
    'ALTER TABLE groups ADD COLUMN reset_on_move INTEGER NOT NULL DEFAULT 1',
  )
  // 'random' was folded into 'manual' (manual now auto-assigns a random color at
  // creation, then leaves it user-editable) — rewrite any pre-existing rows so
  // NoteColorMode's removal of 'random' doesn't leave stale values in old DBs.
  await db.execute("UPDATE groups SET note_color_mode = 'manual' WHERE note_color_mode = 'random'")
  await ensureColumn(
    db,
    'notes',
    'statuses',
    "ALTER TABLE notes ADD COLUMN statuses TEXT NOT NULL DEFAULT '[]'",
  )
  // Diary (2.8): which group counts as "completed" for the day's Completed count.
  // Nullable, no foreign key (same reasoning as on_check_move_to_group_id); unset means
  // a Completed count of 0, no fallback guessing.
  await ensureColumn(
    db,
    'workspaces',
    'completed_group_id',
    'ALTER TABLE workspaces ADD COLUMN completed_group_id TEXT',
  )
}

async function initDb(): Promise<SQLiteDBConnection> {
  const db = await openConnection()
  await db.execute(SCHEMA_SQL)
  await db.execute(ACTIVITY_EVENTS_SQL)
  await db.execute(TEMPLATES_SQL)
  await migrateSchema(db)
  await seedBuiltinTemplates(db)
  // Before seeding: an upgrading install backfills its existing data, while a fresh
  // install has nothing to backfill and the seed logs its own events (eventLog.ts).
  await backfillEventsIfEmpty(db)
  // Logs from before checked/counter/list were tracked get those fields' starting values.
  await backfillTrackedStateIfMissing(db)
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
