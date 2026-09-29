# Taskodoro — Phase 2 & Phase 3 Brainstorm (Offline-First Notes)

Session date: 2026-08-26. This captures a planning conversation that follows on from
`Taskodoro-Project-Reference.md`, and resolves several items that file's §11/§15 flagged
as blocking Phase 2 schema/UI work. Where a decision here supersedes something in that
file, the reference doc has been updated to point back here — this doc is where the
reasoning lives, that one stays the consolidated snapshot.

**Scope of Phase 2, as reframed in this session:** SSO (Phase 1) was a pipe test, not
the real UX. The real app is offline-first: it must work fully with zero account, on
both web and Android. Phase 2 builds the local (device-only) data layer and UI for
workspaces, fully customizable groups, and 3 note types (basic / counter / list),
with create/edit/delete on all of them. Login/sync becomes an opt-in Power Tools
feature, built out properly in Phase 3.

---

## 1. Scope change: auth becomes optional

- **Guest-first.** The app opens straight to the board. No login/signup gate on first
  launch, no `ProtectedRoute` blocking `/`.
- Login/signup screens still exist, but are reached from Power Tools ("sync your
  data" / account entry point), not forced at the door.
- **Why:** matches the actual product — a personal task manager that should be usable
  immediately, with account/sync as a value-add, not a toll gate.
- **Implication for the FE auth code:** `lib/auth/ProtectedRoute.tsx` needs to stop
  gating `/`; the `AuthState` machine (`hydrating | authenticated | unauthenticated`)
  keeps working exactly as-is for *when* someone chooses to log in, it just stops being
  a precondition for using the app.
- **Implication for identity:** until a user opts into sync, there is no `user_id` for
  local data — everything is scoped to "this device's local store." Sync (Phase 3) is
  what later associates local data with an account. This is why the ID scheme below
  matters now even though sync isn't built yet.

---

## 2. Local data model (Phase 2)

Originally the reference doc's §15 open questions suggested deferring full
customizable groups/workspaces. This session's decision: **build them now, not later**
— accepting more upfront surface area in exchange for not needing a schema migration
once notes/groups already have real data in them.

### Workspace
| field | type | notes |
|---|---|---|
| `id` | uuid | client-generated (`crypto.randomUUID()`), see §5 |
| `name` | string | |
| `position` | number | manual ordering in the workspace switcher |
| `createdAt` / `updatedAt` | timestamp | |
| `deletedAt` | timestamp \| null | soft delete — see §5 |

### Group
| field | type | notes |
|---|---|---|
| `id` | uuid | |
| `workspaceId` | uuid (FK) | |
| `name` | string | |
| `position` | number | |
| `sortedBy` | `'alphabetical' \| 'manual' \| ...` | see §9 — exact option set still open |
| `noteColorMode` | `'manual' \| 'random' \| 'priority'` | default `'random'` — see §3 |
| `onCheckMoveToGroupId` | uuid \| null | **field exists in schema but is non-functional in Phase 2** — deferred to Phase 3, see §7 |
| `createdAt` / `updatedAt` / `deletedAt` | timestamp | |

### Note
| field | type | notes |
|---|---|---|
| `id` | uuid | |
| `workspaceId` | uuid (FK) | |
| `groupId` | uuid (FK) | |
| `type` | `'basic' \| 'counter' \| 'list'` | |
| `title` | string | |
| `description` | string \| null | |
| `color` | string \| null | ignored for rendering when the group's `noteColorMode !== 'manual'` — see §3 |
| `priority` | `'low' \| 'normal' \| 'medium' \| 'high'` | default `'normal'` — see §4 |
| `position` | number | manual ordering within group |
| `completed` | boolean | meaning is type-dependent — see below |
| `payload` | JSON, type-specific | see below |
| `createdAt` / `updatedAt` / `deletedAt` | timestamp | |

> **Since superseded (2026-09-22):** the `notes` table gained a `statuses` column —
> `NoteStatus { id, text, createdAt }[]`, its own top-level field, not part of
> `payload`. Not reflected in the table above since this doc is a historical planning
> snapshot (see `CLAUDE.md`'s documentation-map note); current-state schema and behavior
> lives in `docs/feat-notes.md`'s "Statuses" section.

**Payload shapes:**
- `basic`: `{}` — title + description only.
- `counter`: `{ value: number, step: number }` — default `step: 1`, no min/max/goal in
  Phase 2 (kept deliberately simple; easy to extend later without a shape change since
  it's JSON).
- `list`: `{ items: { id: string, text: string, completed: boolean, position: number }[] }`
  — flat list, no nesting, no drag-reorder of items in Phase 2 (append/check/remove
  only). Reordering can be added later without a schema change since `position` is
  already there.

**Counter "completed" semantics (proposed default, not yet confirmed):** counter notes
have no checkmark/complete state — they're inherently ongoing, matching the mockups
(§10 of the reference doc notes the counter note has no checkmark-circle). `completed`
is simply unused/`false` for this type. Flag if you want a different behavior (e.g. a
counter that "completes" at a target value).

---

## 3. Note color resolution logic

Per-note color is the default (swatch picker on create/edit, per the mockup), but a
group-level Power Tools toggle can take over:

- `noteColorMode: 'manual'` — user picks freely per note; picker enabled.
- `noteColorMode: 'random'` (**default**) — color is assigned **once, at note creation
  time**, and stored in `note.color` like normal. It does not reshuffle on every
  render/reload. Picker is disabled in the edit UI (grayed out) since the group owns
  this.
- `noteColorMode: 'priority'` — color is **derived live** from `note.priority` via a
  fixed priority→color mapping, not stored. If the note's priority later changes, its
  color updates automatically. Picker is disabled in the edit UI.

This asymmetry (random = frozen at creation, priority = live-derived) is intentional
and worth remembering — it's the kind of detail that's easy to implement inconsistently
if revisited later without this note.

---

## 4. Priority

Resolved: **4 distinct values** — `low`, `normal`, `medium`, `high` — with `normal` as
the default shown on the create/edit screen. This settles reference-doc open question
§15.1.

---

## 5. Storage engine (Phase 2) — deviates slightly from initial framing

Initial framing in this session leaned toward "IndexedDB wrapper now, swap to SQLite
later." On reflection, **recommend reusing `@capacitor/preferences`** instead — the
same abstraction already powering `lib/storage/preferences.ts` for auth session
persistence. It already solves cross-platform parity (transparently backed by
`localStorage` on web, native prefs on Android) with zero new dependencies, and this
repo has already proven it works. Store workspaces/groups/notes as JSON under
versioned keys, load into memory on app start, mutate in memory, persist back.

Swap to `@capacitor-community/sqlite` (the original Decision Log choice) only if/when
data volume or query needs (full-text search, filter queries, Phase 3 sync diffing)
outgrow flat JSON blobs — realistically that point coincides with Phase 3 anyway.
**Flag this for your confirmation** since it's a change from what was picked in this
session's first round of questions.

---

## 6. IDs & sync-readiness (design now, build in Phase 3)

Nothing here is built in Phase 2 — this is purely about not needing a breaking schema
migration when Phase 3 starts:

- Every entity gets a **client-generated UUID** (`crypto.randomUUID()`) at creation
  time, never server-assigned. Offline creation never blocks on a network round trip,
  and no ID remapping is needed when an account later syncs this data up.
- Every entity has `createdAt`/`updatedAt` plus **`deletedAt`** (soft-delete tombstone)
  instead of hard deletes, so Phase 3 sync can detect "this was deleted since we last
  synced" instead of just seeing an absence.
- Suggest a single **`lastSyncedAt`** timestamp stored locally (not per-record dirty
  flags): on sync, push everything with `updatedAt > lastSyncedAt` or `deletedAt` set,
  receive back whatever the server has that's newer, then advance `lastSyncedAt`.
  Simpler than per-record dirty bits and still supports the already-decided
  last-write-wins conflict rule (reference doc §8/§13).

---

## 7. Workspace switcher (Phase 2, in scope now)

Full CRUD: create / rename / delete / switch between workspaces.

- Deleting a workspace cascades a soft-delete to its groups and notes (consistent with
  the `deletedAt` approach above).
- The existing Penpot mockups only show a single workspace ("workspace 1" label) — a
  switcher UI isn't covered by current designs. Flag: may need a small Penpot pass, or
  can be designed inline as a simple header dropdown/modal without a full mockup pass.

---

## 8. Explicitly deferred out of Phase 2

| Item | Deferred to | Why |
|---|---|---|
| "On Check Move To" auto-move rule | Phase 3 | Confirmed in this session — ships as a visible-but-disabled dropdown ("none" only) in Phase 2's group settings screen. Touches note-move + sync semantics together; cleaner once Phase 3 sync exists to track the move as a change. |
| "Total % excluding next-group-check notes" | Phase 3 | Depends directly on the above. |
| "Turnication" (text truncation toggle) | Later / Power Tools pass | Opt-in extra, not core CRUD. Scope (title/body/both? tap vs. chevron to expand?) still unresolved — revisit when building out Power Tools opt-ins specifically. |
| "Sync with Google" (Calendar/Tasks/Keep — distinct from SSO auth) | Later | Target product and sync direction still unspecified. |
| Monetization / tier gating | Unchanged | Still exploratory per reference doc §12. |
| Pomodoro addon | Unchanged | Not core. |

---

## 9. Suggested Phase 2 milestones

1. **Local store layer** — Preferences-backed abstraction + Workspace/Group/Note types
   and CRUD functions (no UI yet). This is the foundation everything else sits on.
2. **Guest-first routing rework** — drop the forced auth gate on `/`, relocate
   login/signup behind a Power Tools entry point.
3. **Workspace switcher UI** — create/rename/delete/switch.
4. **Group CRUD UI** — create/rename/delete/reorder, plus the settings screen
   (`sortedBy`, `noteColorMode`), with "On Check Move To" visibly present but disabled.
5. **Note CRUD UI**, all 3 types — create/edit forms per the reference doc §10 mockup
   fields (title, description, type, color, priority); board rendering per type
   (counter +/- controls, list item checkboxes with strikethrough).
6. **Search/filter screen** (status/priority/color) — last, since it's a read-only view
   over whatever milestones 1–5 produce.

---

## 10. Open items still needing a decision later

- **Counter "completed" semantics** — proposed default above (no complete state); not
  yet explicitly confirmed by you.
- **`sortedBy` option set** — only "A to Z" is shown in mockups. Given `position`
  already exists on notes, manual drag-order is a natural addition; date-based sorting
  is another candidate. Needs a real list before building the settings dropdown.
- **Turnication scope**, **Sync-with-Google target** — both explicitly deferred (§8),
  still need answers whenever they come back into scope.

---

## Relationship to `Taskodoro-Project-Reference.md`

This session's decisions resolve reference-doc §15 open questions **1 (priority), 2
(workspace scope), 3 (note color), 8 (counter checked state — proposed, not confirmed)**,
and supersede part of §11 (groups/workspace now in Phase 2 scope, not deferred).
Questions **4 (on-check-move-to), 5 (total % calc), 6 (turnication), 7 (sync with
Google)** remain open per §8 above. The reference doc has been updated to reflect this
and points back here for the reasoning.
