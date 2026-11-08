# Feature: Offline Data Layer (SQLite)

The local, on-device persistence layer for Workspace/Group/Note — the foundation
everything else in Phase 2 sits on. No network, no backend involvement for any of the
CRUD in this file; this stays a guest-first app where all data lives only on the device
regardless of whether sync (Phase 3, optional, account-gated — see `CLAUDE.md`'s "Sync"
section) is ever turned on.

## Storage engine

`@capacitor-community/sqlite` — real SQLite, not `@capacitor/preferences` (which is
what an earlier planning doc, `docs/phase2-offline-first-plan.md` §5, originally
recommended; overridden deliberately in favor of a real relational store). Native
platforms use the plugin's native SQLite binding directly; **web uses a genuinely
different engine** — `jeep-sqlite`, a Stencil web component backed by `sql.js` (SQLite
compiled to WASM), persisting to IndexedDB.

Bootstrap lives in `src/lib/db/sqlite.ts`:
- `getDb()` — memoized connection setup (idempotent; safe against React StrictMode's
  double-invoked effects).
- `withDb(fn)` — **the required entry point for every CRUD operation.** Serializes all
  DB access onto a single promise queue, because the underlying plugin errors
  ("cannot start a transaction within a transaction") if two callers run statements
  concurrently on the same connection.
- Schema creation (`CREATE TABLE IF NOT EXISTS`), an explicit `migrateSchema()` step,
  and first-run seeding ("Workspace 1" + Todo/In Progress/Completed groups) all run
  once, inside `getDb()`'s init. **There is no schema-version tracking** — `CREATE
  TABLE IF NOT EXISTS` alone is a no-op for a column added to a table that already
  exists on an install from before, so a new column needs an explicit, idempotent
  `ALTER TABLE` in `migrateSchema()` (via `ensureColumn()`'s `PRAGMA table_info`
  existence check, since SQLite has no `ADD COLUMN IF NOT EXISTS`) or it will silently
  never appear on already-created local databases. `groups.reset_on_move` is the first
  column added this way (see `docs/feat-groups.md`'s Group Settings section) — follow
  that pattern for the next one, don't just edit `SCHEMA_SQL`.

## Two real bugs found during verification (not hypothetical — both cost real debugging time)

1. **`sql.js` must be pinned to exactly `1.11.0`** (see `package.json` — no `^`).
   `jeep-sqlite@2.8.0`'s bundled JS glue was built against that specific version;
   newer `sql.js` WASM builds throw `LinkError: ... function import requires a
   callable` on instantiation. Confirmed via multiple independent GitHub issues
   reporting the identical symptom with this exact plugin combination — not unique to
   this codebase. Bumping `jeep-sqlite` later will likely require re-pinning this in
   lockstep; check `sql.js`'s bundled version before touching either.
2. **Web writes don't auto-persist to IndexedDB.** `jeep-sqlite`'s `autoSave` prop
   exists but its save-on-COMMIT timing didn't reliably take effect in testing (Stencil
   lazy-loads the real component implementation asynchronously behind a proxy custom
   element, and property-set timing relative to that load is not obviously safe).
   Fixed by having `withDb()` call `sqlite.saveToStore(DB_NAME)` explicitly after every
   operation on web — deterministic, no dependency on the plugin's internal COMMIT
   detection. **Native does not need this** — writes are durable immediately.

Both were only caught because verification specifically tested *actual persistence
across a fresh browser/app process*, not just same-session behavior — worth remembering
if this layer is ever touched again: same-session checks will pass even if persistence
is silently broken.

## Schema

Three tables (`workspaces`, `groups`, `notes`), snake_case columns; every `lib/db/*.ts`
file owns a row-mapper converting to/from the camelCase TS types in `src/types/`.
Every entity: `id` (client-generated `crypto.randomUUID()`, never server-assigned —
offline creation never blocks on a round trip, and no ID remapping will be needed when
Phase 3 sync associates this data with an account), `created_at`/`updated_at`
(epoch-millis `INTEGER`), `deleted_at` (soft-delete tombstone — **every delete in this
app is a soft delete**, `UPDATE ... SET deleted_at = ?`, never a hard `DELETE FROM`).
Every read query filters `WHERE deleted_at IS NULL` at the SQL level, not in JS after a
plain `SELECT *`.

- **`workspaces`**: `name`, `position`.
- **`groups`**: `workspace_id`, `name`, `position`, `sorted_by`
  (`manual|alphabetical|date|priority`), `note_color_mode` (`manual|random|priority`),
  `on_check_move_to_group_id` (nullable FK to another group in the same workspace —
  functional, see `feat-groups.md`/`feat-notes.md`'s "On Check Move To"),
  `reset_on_move` (`INTEGER NOT NULL DEFAULT 1` — whether a note lands unchecked in its
  destination; only meaningful alongside `on_check_move_to_group_id`. The first column
  added via the `migrateSchema()`/`ensureColumn()` idempotent-`ALTER TABLE` pattern
  described above, rather than only in `CREATE TABLE IF NOT EXISTS`),
  `hide_after_mode` (`never|checked`, default `never`), `hide_after_amount` (default 1),
  `hide_after_unit` (`hours|days`, default `days`) — Group Settings' "Hide Notes After".
- **`notes`** (also `completed_at`, nullable: when the note last became fully checked,
  the clock for "Hide Notes After"): `workspace_id`, `group_id`, `type` (`basic|counter|list`), `title`,
  `description`, `color`, `priority` (`low|normal|medium|high`), `position`,
  `completed` (`INTEGER` 0/1), `payload` (`TEXT`, JSON — type-specific shape, see
  `feat-notes.md`).
- **`workspaces.completed_group_id`** (Diary, 2.8): nullable, no FK. Added via
  `ensureColumn`.
- **`activity_events`** (Diary, 2.8): an **append-only** log, the one table that is
  never soft-deleted or updated (only "Reset to Default" empties it, with everything else).
  - Columns: `workspace_id`, `entity_type` (`note|group`), `entity_id`, `action`
    (`created|moved|deleted|field_changed`), `from_group_id`, `to_group_id`, `field`
    (`title|color|completed|counter|list`), `new_value`, `created_at`.
  - Indexes on `(workspace_id, created_at)` and `(entity_id, field, created_at)`.
  - Schema and write helpers are in `eventLog.ts` (no `sqlite.ts` import, so `sqlite.ts`
    can use it without a cycle); reads are in `events.ts`.
  - **Every note/group write logs inside the same `withDb` call**, including
    `reorderNotes` (drag moves), `deleteGroup`'s note cascade, and `seedIfEmpty`.
  - `backfillTrackedStateIfMissing` (idempotent, every start-up) adds starting values
    for `completed`/`counter`/`list` to notes whose history predates tracking them.
  - `backfillEventsIfEmpty` seeds it once from existing rows on upgrade; `initDb` runs
    it *before* `seedIfEmpty`.
  - See `feat-diary.md`.

- **`templates`** (2026-10-05): `id`, `name`, `builtin_id` (nullable; set on the
  templates the app ships with), `position`, `content` (JSON: groups, their settings and
  sample notes), timestamps, `deleted_at`.
  - Its SQL and `seedBuiltinTemplates` live in `lib/templates/seedBuiltins.ts` (no
    `sqlite.ts` import, same reason as `eventLog.ts`); `initDb` runs both.
  - CRUD is `lib/db/templates.ts`.
  - `seedIfEmpty` is now one call to `instantiateTemplate` (`lib/templates/instantiate.ts`)
    with the factory Default template. That function takes the raw `db`, so it must be
    called inside a single `withDb` and must never call the `withDb`-based CRUD functions.
  - Settings' "Reset to Default" empties this table and re-seeds the built-ins.
  - See `feat-templates.md`.

- **`dirty`** (Phase 3, on all 5 tables above): `INTEGER NOT NULL DEFAULT 0`, set on
  every write, cleared only once a push has been acknowledged by the server. A column,
  not a reused `updated_at` watermark — the sync cursor is opaque (never compared to a
  local clock) and a pulled row carries *another* device's clock, so a clock-based
  watermark would either strand rows after a clock jump or re-push just-pulled rows
  forever. Added via the same `ensureColumn`/`migrateSchema()` idempotent pattern as
  `reset_on_move`/`completed_group_id` above.
- **`sync_deleted_events`** (Phase 3, new table): `{id, deleted_at}`. `activity_events`
  hard-deletes (see below) rather than tombstoning, so a locally-deleted event's id has
  nowhere to live until the next push reports it — parked here, removed once the server
  acknowledges it (`lib/db/eventLog.ts`'s `deleteActivityEvent`/`clearPushedEventDeletions`).

- **`user_state`** (onboarding, 2026-11-08): `{key, value 0/1, updated_at, dirty}`, one row
  per flag ("intro seen", "Diary tour seen", ...). Created by `ensureUserState`
  (`lib/db/userStateSchema.ts`) in `initDb`, **before** `seedIfEmpty`: a missing table
  with existing workspaces means an install that predates onboarding, and its intro and
  board tour are marked seen. Not wiped by logout or `wipeSyncedData`; `resetToDefault`
  deletes it. Syncs (last-write-wins). See `feat-onboarding.md`.

`lastSyncedAt`-equivalent: implemented as an opaque server-issued **cursor** (not a
timestamp — never compared to a local clock or recomputed), one per account, stored in
Preferences (`taskodoro.sync.state`, `lib/storage/preferences.ts`'s `SyncState`) rather
than in SQLite — it's a device-level sync pointer, not domain data. See `CLAUDE.md`'s
"Sync" section and `docs/phase3-sync-plan-from-be.md`.

**Writing a server-pushed row (Phase 3)**: each table's `lib/db/*.ts` file has an
`upsert*FromServer(db, row)` next to its `rowTo*` converter — a mirror-image writer, not
a reuse of `create*`. Two things it must get right that `create*` doesn't need to:
`position` is written **verbatim** from the server, never recomputed via `create*`'s
`SELECT COUNT(*)` scheme (which would renumber every pulled row), and the row's own id
is used directly rather than minting a fresh `crypto.randomUUID()`. These functions
take a raw `SQLiteDBConnection` and must be called from inside one outer `withDb`
(never nested), the same rule `instantiateTemplate` already follows below.

## CRUD surface (`src/lib/db/{workspaces,groups,notes}.ts`)

Each exports `list*`/`get*ById`/`create*`/`update*`/`delete*`, all funneled through
`withDb`. Cascading deletes are real, not just documentation: `deleteWorkspace`
soft-deletes the workspace, then its groups, then all notes in those groups;
`deleteGroup` soft-deletes the group then its notes. `resetToDefault()`
(`src/lib/db/reset.ts`), used by Settings' "Reset to Default", is the one exception to
soft deletes: it really deletes every row of every table (including `activity_events`,
`templates` and `user_state`), clears Preferences and browser storage, then re-runs the seeds. See
`feat-power-tools.md`.

Its hard-delete half is split out as `wipeSyncedData(db)` (Phase 3): same tables,
minus built-in templates, and it leaves Preferences/the auth session alone. Takes the
raw connection so a caller can run it in the same `withDb` as whatever replaces the
data next — used by sync's `use_account` first-sync strategy, which must *not* go
through the full `resetToDefault()` (that would also clear the session mid-sync).

## Verified on a real Android device (not just browser/emulator)

Native SQLite persistence was specifically re-verified on a connected physical Android
device: build → install → create data → **force-stop the app → relaunch** → data intact,
with clean `adb logcat` output (`CapacitorSQLite` query/run traffic, zero crashes). This
was the one item flagged since the 2.1 plan as needing real-device testing, not just
browser testing — browsers can never actually exercise the native code path in
`sqlite.ts` (`Capacitor.getPlatform() === 'web'` is always true in a browser, by
design — see `style-guide.md`'s platform-detection note), so this was the first
time the native branch of this file had ever actually run.
