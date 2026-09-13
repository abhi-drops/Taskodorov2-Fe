# Feature: Offline Data Layer (SQLite)

The local, on-device persistence layer for Workspace/Group/Note — the foundation
everything else in Phase 2 sits on. No network, no backend involvement; this is a
guest-first app where all data lives only on the device until Phase 3 adds sync.

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
  `on_check_move_to_group_id` (column exists, **non-functional** — see
  `feat-groups.md`).
- **`notes`**: `workspace_id`, `group_id`, `type` (`basic|counter|list`), `title`,
  `description`, `color`, `priority` (`low|normal|medium|high`), `position`,
  `completed` (`INTEGER` 0/1), `payload` (`TEXT`, JSON — type-specific shape, see
  `feat-notes.md`).

`lastSyncedAt` — deliberately **not implemented**, despite an early planning doc
listing it as a "scaffold to add." It's specified as a single app-level timestamp (not
a per-row column) for Phase 3 sync diffing; there's nothing to build yet, and adding an
unused storage slot now would be dead code with no reader.

## CRUD surface (`src/lib/db/{workspaces,groups,notes}.ts`)

Each exports `list*`/`get*ById`/`create*`/`update*`/`delete*`, all funneled through
`withDb`. Cascading deletes are real, not just documentation: `deleteWorkspace`
soft-deletes the workspace, then its groups, then all notes in those groups;
`deleteGroup` soft-deletes the group then its notes. `resetToDefault()`
(`src/lib/db/reset.ts`) wipes every workspace via the same cascade, then re-runs the
seed function — used by Power Tools' "Reset to Default."

## Verified on a real Android device (not just browser/emulator)

Native SQLite persistence was specifically re-verified on a connected physical Android
device: build → install → create data → **force-stop the app → relaunch** → data intact,
with clean `adb logcat` output (`CapacitorSQLite` query/run traffic, zero crashes). This
was the one item flagged since the 2.1 plan as needing real-device testing, not just
browser testing — browsers can never actually exercise the native code path in
`sqlite.ts` (`Capacitor.getPlatform() === 'web'` is always true in a browser, by
design — see `style-guide.md`'s platform-detection note), so this was the first
time the native branch of this file had ever actually run.
