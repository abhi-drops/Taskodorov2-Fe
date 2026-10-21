# Phase 3: Sync — Backend Implementation Reference

Status: **backend implemented and now wired up on the client** — see `docs/feat-sync.md`
for the current-state frontend doc. This is the counterpart to this repo's own
`docs/phase3-sync-plan-from-fe.md` — that doc was the input to designing the backend;
this one documents what actually got built in `Taskodoro-Be`, as the contract the
frontend implements against, and remains the authoritative wire-format reference.

**This supersedes `Taskodoro-Be/docs/phase3-sync-plan.md`.** That was an earlier backend
design draft (2026-09-19) — denormalized `user_id` per table, a `since`/`serverTime`
timestamp cursor, a three-table scope (no templates, no Diary log), and LWW done via a
`WHERE stored.updated_at < excluded.updated_at` clause. None of that is what got built.
The real implementation differs in every one of those points (see below) — don't build
against that file.

---

## 1. Endpoint

**`POST /sync`**, authenticated the same way as every other protected route: `Authorization:
Bearer <jwt>` (`lib/api/client.ts`'s existing fetch wrapper already attaches this). No new
auth mechanism — reuses the JWT issued by `/auth/login`/`/auth/signup`/`/auth/google`.

One endpoint for everything, not one per entity — matches what this repo's planning doc
already called for (§7 of `phase3-sync-plan-from-fe.md`).

---

## 2. Request shape

```ts
POST /sync
{
  cursor: number | null,        // null the first time this device ever syncs this account
  strategy?: 'keep_local' | 'use_account',  // only send this on a retry after a 409 — see §4
  deviceId?: string,            // this install's id from getOrCreateDeviceId() — see §11
  changes: {
    workspaces: WorkspaceRow[],
    groups: GroupRow[],
    notes: NoteRow[],
    templates: TemplateRow[],              // omit rows where builtinId is set — see §6
    activityEvents: {
      upserts: ActivityEventRow[],         // new rows AND coalescing in-place edits, same shape
      deletes: string[],                   // ids hard-deleted locally since last sync
    },
  },
}
```

Send only rows that actually changed since the client's last synced cursor (new, edited, or
soft-deleted) — not the client's whole local dataset every time. On a brand-new device's
very first sync, that's naturally "everything," since nothing has a cursor yet.

### Row shapes (wire JSON, camelCase — the server maps these 1:1 to Postgres columns)

```ts
type WorkspaceRow = {
  id: string                 // the client's existing crypto.randomUUID(), unchanged
  name: string
  position: number
  completedGroupId: string | null
  createdAt: number           // epoch ms, same representation as SQLite already uses
  updatedAt: number
  deletedAt: number | null    // soft-delete tombstone, same meaning as the local column
}

type GroupRow = {
  id: string
  workspaceId: string
  name: string
  position: number
  sortedBy: string             // 'manual' | 'alphabetical' | 'date' | 'priority'
  noteColorMode: string         // 'manual' | 'priority'
  onCheckMoveToGroupId: string | null
  resetOnMove: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

type NoteRow = {
  id: string
  workspaceId: string
  groupId: string
  type: string                  // 'basic' | 'counter' | 'list'
  title: string
  description: string | null
  color: string | null
  priority: string               // 'low' | 'normal' | 'medium' | 'high'
  position: number
  completed: boolean
  payload: unknown               // type-specific JSON, passed through opaquely — not parsed server-side
  statuses: unknown               // { id, text, createdAt }[], same — opaque passthrough
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

type TemplateRow = {
  id: string
  name: string
  builtinId: string | null       // rows with this set are never sent — see §6
  position: number
  content: unknown                // whole TemplateContent document, opaque passthrough
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

type ActivityEventRow = {
  id: string
  workspaceId: string
  entityType: string              // 'note' | 'group'
  entityId: string
  action: string                   // 'created' | 'moved' | 'deleted' | 'field_changed'
  fromGroupId: string | null
  toGroupId: string | null
  field: string | null
  newValue: string | null
  createdAt: number
  // no deletedAt — see §7, this table hard-deletes instead
}
```

The server does **no business-logic validation** on any of this beyond structural
type-checking and the ownership checks in §5 — e.g. it never second-guesses `payload`
against `type`, or validates enum values. Exactly as decided on the frontend side: sync is
a dumb, authenticated, per-account row store with last-write-wins merge, not a second place
app rules live.

---

## 3. Response shape

```ts
{
  cursor: number,               // the new cursor to persist and send on the next sync
  changes: {
    workspaces: WorkspaceRow[],   // every row across ALL devices with server activity
    groups: GroupRow[],            // newer than the cursor you sent — this request's own
    notes: NoteRow[],               // pushed rows included (applying them back is a no-op)
    templates: TemplateRow[],
    activityEvents: {
      upserts: ActivityEventRow[],
      deletes: string[],           // ids to remove locally — see §7
    },
  },
  deviceActivity?: {              // only present if the request carried deviceId — see §11
    otherDeviceCount: number,
    otherDeviceActiveNow: boolean,
  } | null,
}
```

Apply `changes` into SQLite via the existing `lib/db/{workspaces,groups,notes,templates}.ts`
write paths (already idempotent upserts by id, so this is wiring, not new merge logic
client-side) — then persist `cursor` as the new `lastSyncedAt`-equivalent pointer. **The
cursor is an opaque number, not a timestamp** — don't do arithmetic on it, don't compare it
to a local clock, just store whatever the server returns and send it back verbatim next
time.

---

## 4. First-sync conflict (`cursor: null`)

The one case needing explicit UI, per the product decision already made for this phase:
when a device syncs for the first time *and the account already has data from some other
device*, the server does **not** silently merge. Flow:

1. Client calls `POST /sync` with `cursor: null` and its full local `changes`.
2. If the account has no data yet (brand-new account, or this is the very first device to
   ever sync it): server just applies the upload normally, no special handling, done.
3. If the account **does** already have data: server responds `409` with
   `{ needsSyncStrategy: true }` and applies nothing — the uploaded `changes` are discarded,
   not partially applied.
4. Client now needs to **ask the user**: "keep this device's data" or "use what's already on
   your account" — this is the UI that needs building (Power Tools → Account is the natural
   place, next to the existing disabled "Sync with Google" placeholder). Retry `POST /sync`
   with the same `cursor: null` and `changes`, plus `strategy` set to whichever the user
   picked:
   - `strategy: 'use_account'` — this device's local `changes` are discarded server-side;
     response is everything on the account. **The client is responsible for wiping/replacing
     its own local SQLite state with the pulled data** — the server doesn't know what "keep
     local" vs "discard local" means for the client's on-disk database.
   - `strategy: 'keep_local'` — server soft-deletes everything previously on the account,
     then applies this device's upload as the new state. Response reflects that: old rows
     come back with `deletedAt` set, this device's rows come back fresh. No special client
     handling needed here beyond the normal "apply `changes`" path, since tombstones are
     applied the same way as any other soft-delete.

---

## 5. Ownership & validation (why a request can come back `400`)

- Every `workspaceId` referenced anywhere in the payload (a workspace's own `id`, or a
  `workspaceId` on a group/note/activity event) must either already belong to the
  authenticated account, or be a **brand-new** workspace id appearing in
  `changes.workspaces` this same request. Referencing a workspace id that belongs to nobody
  and isn't being created in this request → `400`. Referencing one that already belongs to
  a *different* account → `400` (this should never happen with real client-generated UUIDs;
  it's a defense-in-depth check, not something to design UX around).
- A brand-new workspace id is automatically claimed as owned by the syncing account — no
  separate "create workspace" step needed.
- Templates are scoped directly to the account (not per-workspace) — no `workspaceId`
  ownership check applies to them, just the authenticated user id.
- On any validation failure, the **whole request is rejected**, nothing partially applied —
  simpler to reason about than a per-row errors array, and matches the "one DB transaction"
  framing already decided for this endpoint.
- Each entity array in a single request is capped at 2000 rows. A real payload this large is
  not expected from normal usage; this is a defensive limit against a buggy or compromised
  client, mirroring the existing template-import size caps (`docs/phase3-sync-plan-from-fe.md`
  §6).

---

## 6. Templates: built-ins never sync

Rows where `builtinId` is set (the 6 factory templates) are **not sent by the client and
are ignored if present** — the server never stores or returns them. They're identical on
every install already; shipping them over the wire would just be redundant bytes. Only
user-created templates (`builtinId: null`) round-trip. No client-side change needed here if
the sync-push code simply filters `templates.filter(t => t.builtinId === null)` before
building the request — but it does need to **not break** if a built-in template's `id`
happens to collide with something else; it shouldn't, since built-in ids are a separate
namespace from `crypto.randomUUID()`.

---

## 7. Diary log (`activity_events`) — hard delete, not soft delete

Every other entity uses `deletedAt` tombstones. The Diary log doesn't, because of the
3-minute coalescing behavior already documented in `docs/phase2-apps-diary-plan.md` /
`phase3-sync-plan-from-fe.md` §4: an edit that reverts back to its pre-edit value within the
coalescing window **deletes the row outright** locally, not just updates it. The sync
contract mirrors that distinction:

- `changes.activityEvents.upserts` — insert-or-update-by-id, exactly like every other table
  (handles the coalescing in-place edit case: same id, new `newValue`/`createdAt`).
- `changes.activityEvents.deletes` — a separate list of ids that were hard-deleted locally
  (the "reverted within the window" case). The server removes the row and remembers the id
  was deleted (so another device that already pulled it can learn to remove it too).
- On the pull side, `changes.activityEvents.deletes` in the **response** is the list of ids
  to remove from local SQLite — this is new: every other entity type communicates deletion
  via a tombstone field on the row itself, but the Diary log has no row left to carry one,
  so the id list is the only signal. Make sure the apply-logic for this one table
  specifically deletes-by-id from this list, separately from upserting `upserts`.

---

## 8. Known limitation, by design (not a bug to work around)

Reordering is last-write-wins **per row**, not per list. Two devices reordering the same
group's notes differently while both offline can produce duplicate or gapped `position`
values after both sync. This was an accepted tradeoff already (`phase3-sync-plan-from-fe.md`
§7) — no CRDT-style ordering was built for v1. If this ever actually bites someone in
practice, it's worth a fresh design pass rather than a quick patch — not something to fix
incidentally while wiring up sync calls.

---

## 9. Device-aware adaptive polling

Pure event-driven sync (foreground/resume, after-edit, manual refresh — §11 below) means
a second device's edit doesn't show up here until *this* device does one of those things.
This adds a tight poll, but **only while there's a real chance of catching a live
cross-device edit** — not a flat interval that runs forever on every multi-device account.

- `lib/storage/preferences.ts#getOrCreateDeviceId()` — a per-**install** id (not per
  account), generated once via `crypto.randomUUID()` and persisted. A reinstall gets a new
  one; that's correct, it's a new device from the account's perspective. Sent as
  `deviceId` on every `/sync` call (`syncEngine.ts#doSync`).
- The backend upserts `(userId, deviceId) → lastSeenAt` on every call that carries one, and
  returns two numbers derived from that table, excluding the calling device itself:
  - `otherDeviceCount` — any other device seen in the last 30 days. Informational; not
    currently surfaced in any UI (kept backend-only per product decision).
  - `otherDeviceActiveNow` — any other device seen in the last **90 seconds**. This is the
    only one the client acts on.
- `SyncContext.tsx` stores the last response's `otherDeviceActiveNow` and runs a **10
  second** `setInterval(() => trigger())` only while it's `true` **and** the app is
  foregrounded (`lib/platform/useIsAppForeground.ts`, a new hook — `useAppForeground`
  already in use elsewhere only fires a one-shot callback on resume, it doesn't track
  live foreground state, which an interval-gating effect needs). The interval clears the
  moment either condition goes false — an idle multi-device account (nobody else has
  synced in 90s) costs nothing beyond the existing event-driven triggers, exactly like a
  single-device account.
- No new concurrency handling was needed for the interval itself: `runSync`'s existing
  `inFlight` dedup (`syncEngine.ts`) already collapses an overlapping poll tick with any
  other trigger firing close together.

---

## 10. Auth response change

`/auth/signup`, `/auth/login`, `/auth/google`, and `/auth/me` now all return `name` on
`user` (`{ id, email, name, ... }`) — previously always omitted even though signup accepted
it. `types/auth.ts`'s `User.name` is already optional/nullable on the client, so this is a
non-breaking addition, not a required change — but worth actually surfacing `name` in the
Account UI now that the backend sends it.

---

## 11. Frontend implementation status

All of this is now built — see `docs/feat-sync.md` for the current-state doc on exactly
how. Kept here as a record of what had to land, not a live checklist:

1. **A sync cursor pointer** — `lib/storage/preferences.ts`'s `SyncState`/`SYNC_STATE_KEY`
   (account-scoped, same small-pointer-value pattern as `taskodoro.workspace.activeId`).
2. **Dirty-row tracking** — a `dirty` column on every synced table, set on every write and
   cleared only once a push is acknowledged (`feat-sync.md`'s "Local dirty tracking").
3. **Triggers**: app foreground/resume, after local edits (debounced 5s,
   `EDIT_SYNC_DEBOUNCE_MS`), manual refresh, `online` event — plus the device-activity
   10s poll from §9 above, the one addition on top of the original trigger set.
4. **First-sync strategy UI** (§4 above) — `SyncStrategyDialog.tsx`.
5. **Apply-pulled-changes wiring** — `lib/sync/applyChanges.ts`, including the Diary log's
   delete-by-id special case (§7).
6. **Error/offline handling** — `syncErrors.ts`'s `classifySyncError`, surfaced via
   `SyncStatusBadge.tsx`; never blocks local reads/writes.
7. Power Tools' "Sync With Google" label — kept as-is rather than renamed, since sync is
   deliberately gated on Google sign-in specifically, not any authenticated session
   (`feat-sync.md`'s "Why gated on Google specifically").

---

## Relationship to other docs

- `docs/feat-sync.md` (this repo) — the current-state doc for what the frontend built
  against this contract. Read that first if you want "how sync actually works today";
  this doc stays the wire-format reference.
- `docs/phase3-sync-plan-from-fe.md` (this repo) — the input this backend contract was
  designed from, now a historical planning doc (its own status line says so) — still an
  accurate snapshot of the client's data model as of when it was written, but superseded
  as current-state documentation by `feat-sync.md` above.
- `Taskodoro-Be/docs/phase3-sync-plan.md` — superseded by this doc for anything backend-API
  related (see the note at the top). Left in place in that repo rather than deleted, since
  retiring someone else's planning doc isn't this doc's call to make.
