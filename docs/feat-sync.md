# Feature: Sync (Phase 3)

Optional, account-gated cross-device sync against `Taskodoro-Be`'s `POST /sync`. Fully
implemented on both sides as of this doc. The app stays guest-first and fully usable
offline regardless — sync only activates for a session signed in with Google, and a
failed/offline sync never blocks local reads or writes.

The wire contract (request/response shapes, the 409 first-sync conflict, ownership
rules, row caps) is documented in full in `docs/phase3-sync-plan-from-be.md` and isn't
repeated here — this doc covers how the frontend implements against it. The original
frontend data/feature inventory that contract was designed from is
`docs/phase3-sync-plan-from-fe.md`.

## Why gated on Google specifically

Sync is **not** turned on by any authenticated session — logging in with email/password
leaves it off. It activates only when the current session's `authMethod` is `'google'`
(`AuthState.authMethod`, `lib/auth/authContext.ts`), set by `loginWithGoogle` and
persisted alongside the token (`taskodoro.auth.method` in `preferences.ts`). This is
why Settings' "Sync With Google" label was kept rather than generalized to something
like "Sync Across Devices" — it's an accurate, narrower claim than "sync whenever
you're logged in."

`SyncChip` (`src/pages/PowerToolsPage.tsx`) is a separate control from the Account row
above it for exactly this reason: a password-authenticated user's Account row reads
"authenticated," but the sync chip still reads "Off," and tapping it runs Google
Sign-In right there (`useGoogleSignIn(null)` — the `null` `redirectTo` keeps the user
on Settings instead of the Login/Signup pages' usual redirect to `/`).

## Local dirty tracking

No row anywhere tracked "changed since last sync" before this. Every table
(`workspaces`, `groups`, `notes`, `templates`, `activity_events`) now has a
`dirty INTEGER NOT NULL DEFAULT 0` column, set on every write and cleared only once a
push has been acknowledged.

A column, not a reused `updated_at` watermark: the sync cursor is explicitly opaque
(the client never compares it to a clock or does arithmetic on it), and a *pulled* row
carries another device's clock, not this one's. A watermark scheme would either strand
rows after a local clock jump (NTP correction, timezone travel) or re-push just-pulled
rows forever if a peer's clock runs ahead. `clear*Dirty(db, pushed)` in each
`lib/db/*.ts` file clears `dirty` by `id` **and** `updated_at` equality (not just id) —
so a row edited again while its push was still in flight stays dirty and gets re-sent,
with no clock comparison involved.

`activity_events` is append-only and hard-deletes rather than tombstoning (see
`feat-diary.md`'s "Sync" note) — a deleted event's id is parked in a new
`sync_deleted_events` table until the next push reports it and the server has
acknowledged it.

## The engine (`src/lib/sync/`, no React)

- **`collectChanges.ts`** — `collectNextBatch(db)` fills one request's worth of dirty
  rows **by entity type**, not mixed: workspaces, then groups, then notes, then
  templates, then activity-event upserts, then activity-event deletes, each capped at
  `PUSH_CHUNK_SIZE` (500, comfortably under the server's 2000-row cap). Phasing by type
  is what satisfies the backend's ownership rule — a `workspaceId` must already belong
  to the account or be new *in the same request*, so a chunk mixing entity types could
  split a brand-new workspace from the notes referencing it across two requests and get
  a whole-request `400`. `markEverythingDirty(db)` runs once, only when the cursor is
  `null` (this device's very first sync), so "push everything" flows through the same
  chunked loop as every later sync instead of being a special case.
- **`applyChanges.ts`** — `applyPulledChanges(db, changes)` writes a pull in the same
  dependency order. Never calls into `eventLog.ts`: the server already sent the real
  activity events for whatever changed, so synthesizing local ones would duplicate the
  Diary and push fabricated history back out.
- **`syncEngine.ts`** — `runSync({token, accountId, strategy?})`: collect → push → (if
  `strategy === 'use_account'`) wipe → apply → clear dirty receipts → save cursor →
  repeat until nothing is left to send and the last pull was empty. Each phase runs
  inside its own `withDb` call, never nested (the same rule `instantiateTemplate`
  follows — see `feat-offline-data-layer.md`). A module-level in-flight guard makes
  concurrent calls (React StrictMode's double-invoked effects, two triggers firing
  close together) share one run instead of racing two pushes.
- **`syncErrors.ts`** — classifies a failed call as `offline` / `unauthorized` /
  `rejected` / `unknown`. A failed push leaves every `dirty` flag and
  `sync_deleted_events` row untouched and simply stops — nothing is retried on a timer.
  The next foreground, edit, `online` event, or manual tap tries again. This is what
  keeps a sync failure from ever blocking the offline experience: no local write path
  awaits the network, ever.

## Writing a pulled row (`upsert*FromServer` in each `lib/db/*.ts`)

Not a reuse of the existing `create*` functions — two things those get wrong for a
server-origin row:
- **`position` is written verbatim.** `create*` computes position via
  `SELECT COUNT(*) WHERE ... AND deleted_at IS NULL` at insert time; applying that to a
  pulled row would renumber it against purely local state instead of using the
  position the server (and every other device) agrees on.
- **The id comes from the wire, not `crypto.randomUUID()`.** `create*` always mints its
  own id, so there's no existing path that can insert a caller-supplied id.

Each is a plain `INSERT ... ON CONFLICT(id) DO UPDATE SET ..., dirty = 0`, living next
to that table's `rowTo*` converter. One more table-specific rule:
`upsertTemplateFromServer` never calls `uniqueName()` — a pulled template can collide
in name with a local one, and renaming it locally would mark it dirty and push a
divergent name back, ping-ponging forever. A duplicate name is an accepted, harmless
outcome (same family as the backend contract's own accepted per-row-reorder caveat).

## Triggers

- **App foreground**: `lib/platform/useAppForeground.ts` — `@capacitor/app`'s
  `appStateChange` on native, `visibilitychange` on web (same API
  `useTiltShrink` already uses, for an unrelated reason).
- **After a local edit**: `lib/db/localChange.ts`'s module-level pub/sub
  (`notifyLocalChange()`, called at the end of every mutating CRUD function) debounced
  5 seconds (`EDIT_SYNC_DEBOUNCE_MS`, `syncEngine.ts`) — longer than the note editor's
  own 600ms autosave debounce, so a burst of keystrokes becomes one push.
- **`online`**: the browser event, for immediate recovery from an offline status.
- **Manual**: "Sync Now" in the Settings chip. No pull-to-refresh gesture on the board
  — it's a `@dnd-kit` drag surface on mobile, and a vertical pull would compete with
  note drags.

## First-sync conflict

A `409` (this device has never synced and the account already has data elsewhere)
surfaces as `SyncStrategyDialog` (`src/components/SyncStrategyDialog.tsx`), rendered
from `App.tsx` itself rather than only from Settings — a Google sign-in can trigger
this right over the board on a fresh device, since login navigates to `/`.

Two choices, each behind its own second `ConfirmDialog` step (a one-time,
irreversible, whole-dataset decision — an accidental tap is exactly the failure mode a
second confirmation exists to prevent elsewhere in this app):
- **Keep this device's data** — the server soft-deletes the account's existing data and
  applies this device's upload; the response's tombstones for the old rows apply
  through the ordinary `upsert*FromServer` path, same as any other soft-delete.
- **Use my account's data** — the response-applying `withDb` runs
  `wipeSyncedData(db)` (`lib/db/reset.ts`) immediately before `applyPulledChanges`, so
  there is never a moment on disk where the database is empty. `wipeSyncedData` is a
  hard-delete of the same tables `resetToDefault()` uses, minus built-in templates and
  Preferences/the session — deliberately **not** the full reset, which would also sign
  the user out mid-sync.

The dialog is dismissible (closes to a `needs-strategy` status, re-openable from the
Settings chip) rather than forced, since the user may not be ready to make an
irreversible choice the moment they sign in.

## Cursor storage

One `taskodoro.sync.state` Preferences key (`lib/storage/preferences.ts`'s
`SyncState`: `{accountId, cursor, lastSyncedAt}`), **account-scoped rather than cleared
on logout**. `loadSyncState(accountId)` returns `null` when the stored `accountId`
doesn't match — that alone makes a *different* account's first sync on this device
correctly hit `cursor: null`, while the *same* account logging out and back in resumes
incrementally instead of re-triggering the first-sync conflict prompt every time (a
mis-tap there is unrecoverable, so avoiding spurious re-prompts matters).

## Refreshing the UI after a pull

Neither `WorkspaceContext` nor `useBoard` had a refresh signal before this — both load
once, on mount or on `activeWorkspaceId` change. `SyncProvider` exposes `appliedAt`
(bumped after any pull that wrote something); both now include it in their load
effect's dependency array. `PowerToolsPage`/Diary/`useTemplates` don't yet — lower
priority, left for a follow-up pass.

## Known accepted limitation

Reordering is last-write-wins **per row**, not per list. Two devices reordering the
same group's notes differently while both offline can produce duplicate or gapped
`position` values after both sync. No CRDT-style ordering was built for v1 — see
`docs/phase3-sync-plan-from-be.md` §8.
