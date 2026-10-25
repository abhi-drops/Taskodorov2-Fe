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
"authenticated," but the sync chip still reads "Off," and connecting runs Google
Sign-In right there (`useGoogleSignIn(null)` — the `null` `redirectTo` keeps the user
on Settings instead of the Login/Signup pages' usual redirect to `/`).

**Not-yet-connected renders differently by platform, on purpose.** Native: the chip
itself is the control — tapping it calls `handleNativeSignIn()` directly, which drives
the system account picker, so it's the same single clickable-chip shape the
already-connected status view uses. Web has no programmatic trigger for Google's
popup/One Tap flow — the real `<GoogleLogin>` button has to be the thing the user
taps — so instead of layering our own look-alike chip on top of it (which read as two
separate "sign in with Google" prompts stacked together, fixed 2026-10-25), that case
renders one merged card: a label/description, then the real button underneath,
nothing else pretending to be clickable.

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
- **Device-activity poll**: a 10s timer, only while another device is active right now —
  see its own section below. The one trigger that's genuinely periodic rather than
  event-driven.

## Device-aware adaptive polling

The triggers above are all event-driven — none of them tell *this* device about a change
made on another device until something happens locally (foreground, an edit, etc.). To
close that gap without building realtime push (websockets/Durable Objects, explicitly
deferred — `docs/phase3-sync-plan-from-be.md` §9), a 10-second poll runs, but **only**
while there's a real chance of catching a live cross-device edit:

- `getOrCreateDeviceId()` (`preferences.ts`) — a per-**install** id, independent of login
  session, generated once via `crypto.randomUUID()` and sent as `deviceId` on every
  `/sync` call. A reinstall gets a new one — correct, since that's a new device from the
  account's perspective.
- The backend tracks `lastSeenAt` per `(account, device)` and returns
  `deviceActivity.otherDeviceActiveNow` — whether some *other* device has synced in the
  last 90 seconds (not just whether one exists; an idle second device shouldn't cost
  anything). `otherDeviceCount` (any other device in 30 days) also comes back but isn't
  surfaced anywhere client-side yet.
- `SyncContext` remembers the last response's `otherDeviceActiveNow` and runs
  `setInterval(() => trigger(), 10_000)` only while it's `true` **and**
  `useIsAppForeground()` (`lib/platform/useIsAppForeground.ts`, new — unlike
  `useAppForeground`, which only fires a one-shot callback on resume, this tracks live
  foreground state, which an interval needs to gate on continuously). Either condition
  going false clears the interval on the next render.
- No extra dedup needed: `runSync`'s existing in-flight guard already collapses a poll
  tick that lands while another trigger's sync is still running.

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

## Cursor storage, and why logout wipes local data

One `taskodoro.sync.state` Preferences key (`lib/storage/preferences.ts`'s
`SyncState`: `{accountId, cursor, lastSyncedAt}`), the opaque cursor plus which
account it belongs to.

**Logging out of a Google session clears this device's synced data, not just the
session, and reseeds the same starting board a fresh install gets.** `SyncContext.tsx`
watches for `eligible` (signed in with Google) going from true to false and, when it
does: hard-deletes every synced table (`withDb((db) => wipeSyncedData(db))`, same
primitive the `use_account` first-sync strategy uses — see `lib/db/reset.ts`), then
re-seeds via `seedIfEmpty(db)` (Workspace 1, Todo/In Progress/Completed — the exact
same call `initDb()` makes on a brand-new install) in the same transaction, and clears
the cursor (`clearSyncState()`). The device reads as "like a new user" immediately
after logout, not a blank board.

This was a deliberate simplification over the alternative (detect that local data
belongs to a different account than the one now signing in, and force the same
keep-local/use-account choice the server's 409 gives on a genuine conflict). That
alternative is more "correct" in the abstract — it never destroys data without asking
— but the chosen behavior is simpler to reason about and matches what was actually
asked for: no prompt on an ordinary account switch, ever. The real failure mode this
fix closes: without it, signing into a different Google account than the one last used
on this device didn't clear anything, so the previous account's notes just kept
showing — and if the new account happened to have no cloud data of its own yet (no 409
to catch it), the old account's local leftovers would silently become the new
account's synced data with no prompt at all.

**The reseeded board is itself local data, and that's exactly what creates a second
problem the first fix alone doesn't solve.** The next Google sign-in always starts from
`cursor: null` (cleared above) — and per the backend contract, *any* `cursor: null`
request is treated as a conflict (409) the moment the signing-in account has cloud data
of its own, regardless of whether the local push is meaningful or just this placeholder
board. Without something more, reseeding would reintroduce the exact prompt the
account-switch fix was meant to eliminate — on every ordinary logout→login cycle, even
back into the same account. The fix: `markPendingFreshLogin()`, set alongside the wipe
above. `syncEngine.ts#doSync` consumes it (reads and clears, one-shot) the one time it
matters — an unprompted first-sync conflict (no `strategy` picked yet) — and silently
retries with `strategy: 'use_account'` instead of surfacing `needs-strategy`, discarding
the placeholder board in favor of whatever the account actually has. A conflict that
happens for any *other* reason (a genuinely new device/install that was never through
this logout path) never finds the marker set, so `SyncStrategyDialog` still shows
exactly as before for that case — this only silences the prompt for the one scenario it
was built to silence.

Two tradeoffs worth knowing, both accepted as the cost of the simpler behavior:
- Any local edit made in the last few seconds before logout that hadn't yet been pushed
  (the 5s post-edit debounce, §Triggers above) is lost, not carried over — logout
  doesn't wait for a final sync first.
- Any guest editing done on the reseeded board *between* a logout and the next Google
  sign-in is discarded too, the moment that sign-in's auto-resolved first sync replaces
  it with the account's cloud data — it's never merged in.

Revisit only if either turns out to bite someone in practice.

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
