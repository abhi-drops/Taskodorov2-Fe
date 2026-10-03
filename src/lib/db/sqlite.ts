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
  logGroupCreated,
  logNoteCreated,
} from './eventLog'

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

  const now = Date.now()
  const workspaceId = crypto.randomUUID()

  await db.run(
    'INSERT INTO workspaces (id, name, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
    [workspaceId, 'Workspace 1', 0, now, now],
  )

  const todoId = crypto.randomUUID()
  const inProgressId = crypto.randomUUID()
  const completedId = crypto.randomUUID()

  // Chained "On Check Move To": checking a Todo item just means "move it along" so it
  // resets to unchecked on arrival in In Progress; checking an In Progress item means
  // it's actually done, so it keeps its checked state on arrival in Completed.
  const defaultGroups: { id: string; name: string; moveTo: string | null; resetOnMove: number }[] = [
    { id: todoId, name: 'Todo', moveTo: inProgressId, resetOnMove: 1 },
    { id: inProgressId, name: 'In Progress', moveTo: completedId, resetOnMove: 0 },
    { id: completedId, name: 'Completed', moveTo: null, resetOnMove: 1 },
  ]

  for (let i = 0; i < defaultGroups.length; i++) {
    const group = defaultGroups[i]
    await db.run(
      `INSERT INTO groups
        (id, workspace_id, name, position, sorted_by, note_color_mode, on_check_move_to_group_id, reset_on_move, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, 'manual', 'manual', ?, ?, ?, ?, NULL)`,
      [group.id, workspaceId, group.name, i, group.moveTo, group.resetOnMove, now, now],
    )
    // Logged here too (not only via backfill): after "Reset to Default" the activity log
    // is no longer empty, so the backfill wouldn't pick the re-seeded data up.
    await logGroupCreated(db, { id: group.id, workspaceId, createdAt: now })
  }

  // Walks a new user through the "On Check Move To" chain wired above, right in the
  // Todo column they land on first.
  const todoNotes: { title: string; description: string | null; color: string }[] = [
    { title: 'Click to edit me', description: 'Edit Title , Note Type & color ', color: 'yellow' },
    {
      title:
        'Plz check me to go "in progress", then check again to go to "complete" or you can also try drag and drop',
      description: null,
      color: 'coral',
    },
    { title: 'Try "POWER TOOLS" for advanced behaviour edits', description: null, color: 'green' },
  ]

  for (let i = 0; i < todoNotes.length; i++) {
    const note = todoNotes[i]
    const noteId = crypto.randomUUID()
    await db.run(
      `INSERT INTO notes
        (id, workspace_id, group_id, type, title, description, color, priority, position, completed, payload, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, 'basic', ?, ?, ?, 'normal', ?, 0, '{}', ?, ?, NULL)`,
      [noteId, workspaceId, todoId, note.title, note.description, note.color, i, now, now],
    )
    await logNoteCreated(db, {
      id: noteId,
      workspaceId,
      groupId: todoId,
      type: 'basic',
      title: note.title,
      color: note.color,
      completed: false,
      payload: {},
      createdAt: now,
    })
  }
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
  await migrateSchema(db)
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
