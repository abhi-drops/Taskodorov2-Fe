# Phase 3: Sync — Data & Feature Inventory

Status: **historical planning doc.** This was the input to designing the sync feature
with `Taskodoro-Be`, written before any of it existed. Sync has since been built — see
`docs/feat-sync.md` for the current-state doc and `docs/phase3-sync-plan-from-be.md`
for the wire contract. Kept the way `phase2-offline-first-plan.md` is: the record of
*why* certain decisions (§7/§8 below) were made, not meant to be re-read as describing
the app's current state.

Everything below reflects the app as it was **before Phase 3 sync**: fully offline,
guest-first, zero-account. Auth (`docs/feat-auth.md`) existed only to reach the backend
for login — no app data round-tripped through it yet when this was written.

---

## 1. Storage engines in play

- **SQLite** (`@capacitor-community/sqlite`) — all domain data (workspaces, groups,
  notes, templates, the Diary event log). Native: real SQLite file. Web:
  `jeep-sqlite` + `sql.js` → IndexedDB. See `docs/feat-offline-data-layer.md` for the
  `withDb()` serialization requirement and the `sql.js` version pin — both matter for
  anything that touches the connection layer, sync included.
- **Capacitor Preferences** (`@capacitor/preferences`, `localStorage`-backed on web) —
  auth session, active workspace id, a couple of mobile UI toggles.
- **Raw `localStorage`** (bypassing Preferences, synchronous on purpose) — per-panel
  resizable-sidebar width/collapsed state. Desktop/web layout only; not a sync candidate.

No row anywhere currently carries a sync cursor. There is no `lastSyncedAt`,
no per-row dirty flag, no device id. This is being designed from scratch.

---

## 2. SQLite schema (current, soft-delete via `deleted_at` on everything except the
   append-only event log)

### `workspaces`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | client `crypto.randomUUID()` |
| name | TEXT | |
| position | INTEGER | manual ordering |
| completed_group_id | TEXT, nullable | which group's arrivals count as "Completed" in the Diary; no FK |
| created_at / updated_at | INTEGER (epoch ms) | |
| deleted_at | INTEGER, nullable | soft-delete tombstone |

### `groups`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT | logical FK, not DB-enforced |
| name | TEXT | |
| position | INTEGER | |
| sorted_by | TEXT | `manual \| alphabetical \| date \| priority`, default `manual` |
| note_color_mode | TEXT | `manual \| priority`, default `manual` (a former `random` value was migrated away) |
| on_check_move_to_group_id | TEXT, nullable | "On Check Move To" target, no FK |
| reset_on_move | INTEGER (bool) | default 1 |
| created_at / updated_at / deleted_at | INTEGER | |

### `notes`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workspace_id, group_id | TEXT | logical FKs |
| type | TEXT | `basic \| counter \| list` |
| title | TEXT | **required** — a note is never created in the DB until title is non-empty (enforced in `useNoteForm`/`NoteEditorPage`, not the DB layer) |
| description | TEXT, nullable | |
| color | TEXT, nullable | swatch enum `yellow \| coral \| blue \| green`, or null |
| priority | TEXT | `low \| normal \| medium \| high`, default `normal` |
| position | INTEGER | dense 0..n-1 per group, no fractional/gap positions |
| completed | INTEGER (bool) | |
| payload | TEXT (JSON) | type-specific, see below |
| statuses | TEXT (JSON array) | free-text timestamped sub-notes, see below |
| created_at / updated_at / deleted_at | INTEGER | |

Payload shapes by `type`:
- `basic`: `{}`
- `counter`: `{ value: number, step: number, target: number | null }`
- `list`: `{ items: [{ id, text, completed, position }] }` — `position` exists in the
  type but there is **no reorder UI for list items**; effectively dead for ordering.

`statuses`: `[{ id, text, createdAt }]` — no edit timestamp; "latest" = highest
`createdAt`.

### `activity_events` (the Diary log — append-only; this is the one table that is
   genuinely a log, not current-state)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT | |
| entity_type | TEXT | `note \| group` |
| entity_id | TEXT | |
| action | TEXT | `created \| moved \| deleted \| field_changed` |
| from_group_id, to_group_id | TEXT, nullable | moves |
| field | TEXT, nullable | `title \| color \| completed \| counter \| list \| status` |
| new_value | TEXT, nullable | encoded value, or markers `'seed'` / `'wipe'` |
| created_at | INTEGER | |

Indexes: `(workspace_id, created_at)`, `(entity_id, field, created_at)`.

Behaviorally dense — see §4. This table is append-only in principle, but title/status
edits within a 3-minute debounce window **update the existing row in place** rather than
inserting a new one (and can delete themselves back out if the user reverts to the
pre-edit value within that window). That matters for sync: it's not a pure
insert-only log at the wire level, even though it reads as one.

### `templates`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | unique among live templates (`Name`, `Name (2)`, …) |
| builtin_id | TEXT, nullable | set only on the 6 factory templates; **cannot be deleted** (`WHERE builtin_id IS NULL` guard) |
| position | INTEGER | built-ins at negative positions, sort before user templates |
| content | TEXT (JSON `TemplateContent`) | whole-document read/write, see §6 |
| created_at / updated_at / deleted_at | INTEGER | |

**Cascading deletes** (soft, done at the CRUD layer, no `ON DELETE CASCADE`):
`deleteWorkspace` → its groups → their notes. `deleteGroup` → its notes.
`deleteGroup`/`deleteNote` each log a Diary event for every row they touch.
**`deleteWorkspace` does not log anything to the Diary** — inconsistent with the other
two cascades, and a thing a sync design should deliberately decide on rather than
inherit by accident.

---

## 3. Local-only state (not domain data, but round-trips through storage)

### Auth session (`lib/storage/preferences.ts`, keys under `taskodoro.auth.*`)
- `taskodoro.auth.token` — raw token string
- `taskodoro.auth.user` — JSON `{ id, email, name?, avatarUrl? }`

No refresh token, no expiry, no "remember me". `name` is optional because the real
backend's `/auth/signup` and `/auth/login` only ever return `{id, email}` on `user`,
never `name` — even though signup *accepts* a `name` in its payload. Worth deciding in
the sync/account design whether that finally gets fixed.

### Other Preferences keys
| Key | Value | Purpose |
|---|---|---|
| `taskodoro.workspace.activeId` | string | last-active workspace; falls back to first workspace if stale |
| `taskodoro.ui.tiltAddButton` | string, checked via `!== 'off'` | mobile floating-add-button tilt-to-wake toggle, defaults on |
| `taskodoro.ui.addButtonPosition` | `high \| medium \| low` | floating-add-button vertical position, unknown falls back to `medium` |

### Raw `localStorage` (bypasses Preferences on purpose — sync avoidance by async-write-jank, not by design intent)
- `taskodoro.ui.panel.<key>` → `{ width: number|null, collapsed: boolean }` per named
  resizable sidebar (`apps`, `diary-day-details`, template-editor sidebar). Desktop/web
  layout only — not meaningfully a cross-device sync candidate.

### Explicitly *not* persisted anywhere today
- Search/filter state on `/search` — page-local, lost on navigation.
- Mobile's "active group tab" (`lastActiveGroupId`) — in-memory module state, resets on
  restart.
- `MobileWebNotice` dismissal — re-shows every load at phone width; `reset.ts` mentions
  clearing it but there's nothing actually stored for it today.

---

## 4. The Diary log — the part most likely to need special sync handling

`docs/feat-diary.md` / `lib/db/eventLog.ts` in full:

- **Coalescing**: title edits and status-text edits within 3 minutes of the prior edit
  to the *same field on the same note*, with nothing else logged on that note in
  between, update the existing row instead of inserting a new one. If the value lands
  back at the pre-run value, the row is deleted outright.
- **Tracked fields only**: `title`, `color`, `completed`, `counter` (value only),
  `list` (full `[{id,text,completed}]` snapshot). Description, priority, and counter
  step/target are deliberately untracked, "to keep the log from becoming noise."
- **Markers**: `new_value: 'seed'` on bulk template/first-run note creation,
  `new_value: 'wipe'` on a "Wipe All Notes" run — both let the replay UI fold a burst of
  events into one line ("Default notes", "Wiped").
- **Backfill on startup** (idempotent, runs every launch, short-circuits once done):
  reconstructs `created`/`deleted` events for pre-existing rows the first time the table
  is empty, and fills in missing genesis values for tracked fields. Both are explicitly
  lossy — moves/renames from before the Diary existed can never be recovered.
- **Display-only merging**: rapid counter taps (within 60s) and an auto "On Check Move
  To" pair (within 2s) are each logged as separate real rows but visually merged only in
  the replay UI. The raw log is never collapsed for these.

If sync ever needs to reconcile two devices' event logs, the in-place row mutation
(coalescing) means "new row = new event" is not a safe assumption — an existing event's
`new_value`/`created_at` can change without a new id appearing.

---

## 5. Feature inventory (offline app, today)

- **Workspaces** — multi-workspace CRUD + switch. New-workspace flow: blank, "start
  from template" (built-in or user template), "import template" (file), or "generate
  with AI" (user pastes a downloaded guide into an external AI tool, imports the result).
- **Groups** — board columns; drag-and-drop reorder (notes + groups themselves, via
  `@dnd-kit`); per-group settings (Sorted By, On Check Move To, Reset On Move, Note
  Color mode, Delete).
- **Notes** — 3 types (basic/counter/list); color resolution depends on the owning
  group's `noteColorMode` (manual = assigned once, user-editable; priority = derived
  live from `priority`, ignoring the stored `color`); Statuses sub-feature; debounced
  autosave (600ms) for title/description/status text, immediate save for
  type/color/priority/payload changes.
- **Diary** — month calendar + day replay (desktop) / summary (mobile) over
  `activity_events`. Fully described in §4.
- **Templates** — export/import/reuse of a group+note *structure* (never state — no
  checked boxes, no counter values, no statuses). 6 built-in templates, uneditable in
  place but resettable; user templates fully CRUD. File format in §6.
- **Search & Filter** (`/search`) — read-only cross-group view; group-scope is
  single-select, status/priority/color are filters over resolved values. Not persisted.
- **Settings (Power Tools)** — Account (login/logout), Groups management, Board
  (mobile add-button settings), "Wipe All Notes" (soft-delete all notes in the active
  workspace, keep groups/settings/Diary), "Reset to Default" (hard-delete everything —
  notes/groups/workspaces/activity_events/templates — plus `Preferences.clear()` +
  `localStorage`/`sessionStorage.clear()`, then re-seed built-ins). "Sync with Google" is
  currently a disabled placeholder label, unrelated to the Google *Sign-In* feature.
- **Apps** registry — Diary and Templates today; Pomodoro listed but disabled/unlinked.
- **Auth** — email/password + Google Sign-In, reachable only from Settings → Account.
  Purely a session gate for *future* backend features; today it authenticates but syncs
  nothing. `lib/auth/ProtectedRoute.tsx` exists, unused since the guest-first rework,
  kept for this phase.

---

## 6. Template file format (relevant to sync because it's the one place a document
   already crosses a trust boundary — model for what "export this workspace" might look
   like over the wire)

Wire shape: `{ app: "taskodoro", kind: "workspace-template", version: 1, name, content }`.

`content: TemplateContent = { groups: TemplateGroup[], completedGroupKey: string | null }`.
Each `TemplateGroup` carries its own settings (`sortedBy`, `noteColorMode`,
`onCheckMoveToKey`, `resetOnMove`) plus `notes: TemplateNote[]` — pure structure, no
state (`counterStep`/`counterTarget` yes, current `value` no; list item texts yes,
`completed` no).

Parsing (`parseTemplateFile`) treats input as fully untrusted: malformed JSON or a
wrong `app`/`kind` → reject outright; everything else is tolerant-with-fallback
(unknown enum → default, blank note title → note dropped, dangling cross-reference →
null). Size caps: 50 groups, 200 notes/group, 200 list items, 2000 chars/text field.
All keys (`g1`, `n1`, …) are regenerated on import — nothing from the file's own ids
survives. This untrusted-tolerant-parse pattern is probably the right starting model
for "pull a workspace down from the server," even if the push side can be stricter.

---

## 7. Decisions made so far

- **Multi-device, single user now; multi-user workspace sharing is a near-future
  target.** Sync v1 is "one account's data, consistent across their phone + web," but
  the data model (ownership, future sharing) should be designed so adding
  multi-user-per-workspace later doesn't require a schema rewrite — e.g. don't hard-code
  a 1:1 `user_id ↔ workspace` assumption at the DB level if a join table costs little
  extra now.
- **Conflict resolution: last-write-wins per row.** Important refinement: LWW must
  **not** compare client-reported `updated_at` values across devices, because clock
  skew between e.g. a phone and a laptop will silently drop real edits. The **server**
  stamps the authoritative timestamp (or assigns a monotonic per-account sync sequence
  number) at ingest time, and that server-side value — not the device's local clock —
  is what LWW compares.
- **v1 data scope: everything** — workspaces, groups, notes, templates, Diary
  (`activity_events`), and the local UI prefs (active workspace id, add-button
  settings). Diary is the one table that isn't naturally CRUD-shaped (§4: in-place row
  mutation from coalescing, startup backfill) — treat it as append/update-by-id like
  the rest, but it needs its own test pass for the coalescing edge case (a row changing
  value without a new id appearing).
- **Transport: one sync endpoint, not one per entity type.** `POST /sync` (or similar):
  client sends a batch of everything changed since its last cursor across all entity
  types in one payload; server applies it in dependency order (workspaces → groups →
  notes/templates → activity_events) inside one transaction, then returns everything
  newer than the client's cursor in the same response shape. Reasoning: the schema has
  real cross-entity dependencies and cascading soft-deletes (workspace → groups →
  notes) — splitting sync per entity risks partial syncs where a note lands but its
  renamed parent group doesn't, or a cascade delete only half-applies across two
  separate requests. Request volume for a personal task app is small enough that
  batching costs nothing. Structure the payload by entity type internally (not as
  separate endpoints) so it stays extensible without breaking old clients.

## 8. Still open

1. **Cursor shape** — one monotonic sync-sequence number per account (simplest, but
   needs a new column/table server-side), or a server-stamped `synced_at` per row? The
   client needs to persist whatever cursor it gets back, per account, locally (a new
   Preferences key).
2. **Trigger model** — app foreground, periodic background, explicit pull-to-refresh,
   or realtime (websocket/SSE)? Offline-first means "fully usable with zero
   connection" must stay true regardless of what's chosen.
3. **First-sync merge** — a guest who already has local data and then signs in for the
   first time: upload their existing local workspace as-is, merge with anything already
   on the account, or force an explicit choice ("keep local" vs "use account data")?
   This is the trickiest one-time case and deserves its own design pass before coding.
4. **Deletion retention** — soft-delete tombstones exist locally already; does the
   backend keep them forever, expire after N days, or hard-delete once every synced
   device has acknowledged the tombstone?
5. **`deleteWorkspace`'s missing Diary event** (§2) — fix now (log it like
   `deleteGroup`/`deleteNote` do) before this inconsistency gets baked into the sync
   contract, or intentionally leave workspace deletion outside the Diary?
6. **Auth `User.name`** — the backend never returns it today even though signup accepts
   it. Worth fixing as part of this work, or keep treating it as optional?
7. **Payload limits** — the template import path already caps sizes against untrusted
   input (§6, 50 groups/200 notes per group/2000 chars per field); should the sync
   endpoint enforce the same caps against a buggy or compromised client, given it's now
   account-gated rather than anonymous?
8. **Multi-user groundwork** — if workspace sharing is coming soon, does v1's schema
   add a `workspace_members`-shaped join now (even with exactly one row per workspace
   today), or is that deferred entirely to when sharing actually gets built?
