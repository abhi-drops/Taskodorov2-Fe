# Feature: Groups

Groups are the board's columns (mobile: tabs) — fully user-customizable, not a fixed
Todo/In Progress/Completed enum, even though those three are what the first-run seed
creates. The seeded groups also come pre-wired with "On Check Move To" (`seedIfEmpty`,
`sqlite.ts`): Todo → In Progress (resets to unchecked on arrival — checking a Todo item
just means "move it along", it isn't done yet) → Completed (does **not** reset — an In
Progress item being checked means it's actually finished, so it should still show
checked once it lands in Completed). Completed itself has no move target. This is only
the *seed*; a user can change or remove these rules like any other group's settings.

The seeded Todo group also comes with three starter notes (`seedIfEmpty`, `sqlite.ts`)
that double as an in-context walkthrough for a new user, in place of a separate intro
screen: a yellow "Click to edit me" (description: "Edit Title , Note Type & color "),
a coral note walking through the check-to-move (and drag-and-drop) flow above, and a
green pointer to Power Tools for deeper customization. All plain `basic` notes,
unchecked, `manual` color mode — a user can edit or delete them like any other note.

## Board tabs/columns

Rendered by `HomePage.tsx` via `common_logics/useBoard.ts`, which loads the active
workspace's groups + notes and groups the notes client-side by `groupId`, applying each
group's `sortedBy` to its own note list (see `feat-notes.md` for the 4 sort modes).
**There is no "add group" affordance on the board itself** — despite an earlier
planning doc suggesting a board-level "+", the actual mockups only show a per-column
"+" for *adding a note to that group* (wired to `/notes/new?group=<id>`). The only way
to create a group is Power Tools' "+ NEW GROUP".

Groups are now reorderable by drag (their `position` is no longer fixed at creation
order) — see "Drag-and-drop" below.

### Active tab survives navigating away and back

`useBoard.ts`'s `activeGroupId` (mobile's currently-selected tab; irrelevant on web,
where every column renders at once — see `feat-navigation.md`'s Android back-button
section for the round trip this fixes) is seeded from a module-level
`lastActiveGroupId`, not `useState(null)`. Without this, since `useBoard()` is only
ever instantiated by `HomePage` and `HomePage` fully unmounts when navigating to
`/notes/:id/edit` (or anywhere else) and remounts on returning to `/`, the active tab
would silently reset to the workspace's first group on every return trip — including
via the Android hardware back button/edge-swipe gesture, whose `window.history.back()`
is otherwise a plain history pop with no way to tell `HomePage` which group to
restore. Every `setActiveGroupId` call (both explicit tab switches and the init
effect's own reconciliation) writes through to `lastActiveGroupId`, and the init
effect's existing "does this group still exist" check (falling back to the first
group otherwise) already handles a stale value from a previous workspace correctly —
no extra logic needed there. Deliberately in-memory only, not persisted via
`lib/storage/preferences.ts` — resets on a full app restart/page reload, unlike the
active *workspace* selector (`saveActiveWorkspaceId`/`loadActiveWorkspaceId`), which
was an explicit choice: this wasn't asked for and a module-level value is enough
since `useBoard` has exactly one call site.

## Drag-and-drop

Built with `@dnd-kit/*`. Platform-specific by design (see `CLAUDE.md`'s web/mobile
split) since web shows all columns at once and mobile shows one group at a time via
tabs — dragging a note *between* groups is a fundamentally different gesture on each.

- **Notes**: draggable everywhere, in every group regardless of `sortedBy`. When the
  group is `sortedBy === 'manual'`, `GroupColumn.tsx` wraps the list in a real
  `SortableContext`/`useSortable` so drag-and-drop actually reorders
  (`common_logics/useBoard.ts`'s `moveNote`, persisted via `lib/db/notes.ts`'s
  `reorderNotes`). Every other sort mode still makes each card a plain `useDraggable`
  drag *source* — it can be picked up and dropped into any other group — but does **not**
  wrap the list in a `SortableContext`, since that mode's order is never a drop point,
  always the sort rule's; wrapping it anyway would show a false "reorder" shift
  animation that reverts the instant the list re-sorts. **Dropping into a *different*
  group is always allowed regardless of its sort mode** — the note's `groupId` updates
  and it gets appended (`position` = current count in that group); the drop *position*
  is only honored when the destination is `manual`. No card-level drag handle — the
  whole card stays the click-to-edit target; dnd-kit's activation constraints (mouse:
  distance threshold, touch: long-press delay + a larger tolerance than the mouse
  threshold, since a resting finger drifts more) keep a plain tap from being swallowed
  as a drag. Every drag source also sets `touch-action: manipulation` in its inline
  style — `manipulation`, not `none`: `none` was tried first to make Android's touch
  drag reliable, but it also disables the browser's native vertical scroll for any
  touch starting on that element, which broke scrolling a group's note list entirely
  (nearly the whole list *is* drag-source cards). `manipulation` still blocks
  double-tap-zoom while leaving panning/scroll to the browser — safe here because
  activation is delay-based (long-press), so the touch sensor's own delay+tolerance
  already tells a quick scroll swipe apart from a held press; `none` was never actually
  needed for drag detection to work, only for the (unrelated) distance-based mouse case.
- **Groups/columns**: also draggable — web's column header chip and mobile's tab (see
  `components/BoardTabStrip.tsx`) are both sortable, persisted via
  `lib/db/groups.ts`'s `reorderGroups`. This is new: `position` used to only ever be
  set once at creation (see the stale claim in Group Settings' "Sorted By" bullet below
  — no longer true).
- **Mobile cross-group move**: mobile shows one group at a time, so there's no second
  column to drag a note onto directly. An earlier version tried making the tabs
  themselves double as drop targets (hover-and-dwell to switch), but a tab is a small,
  multi-purpose touch target (tap-to-switch *and* long-press-to-reorder *and* a live
  geometry hit-test) and this was unreliably fussy on a real device. Replaced with
  `components/GroupDropTargets.tsx`: as soon as a note drag starts, `HomePage.tsx` swaps
  the tab strip out for a row of large "drop here" tiles, one per *other* group, each a
  plain `useDroppable` — ordinary dnd-kit collision detection, no custom hit-testing or
  timers. On a successful drop, `HomePage.tsx` switches the active tab to the
  destination group (`useBoardDnd`'s `onNoteMovedToGroup` callback, mobile-only — web
  has no single "active" column to update since every column is visible at once) so the
  user immediately sees where the note landed, and can drag-reorder it within that
  group right away if it's `manual`.
- **Persistence**: `position` stays a dense per-group (or per-board, for groups)
  integer, reindexed to `0..n-1` on every drop via the bulk `reorderNotes`/
  `reorderGroups` helpers — no fractional/gap positions, since this is a local-only
  SQLite app with no merge/sync semantics to protect (see
  `docs/feat-offline-data-layer.md`).
- Mobile touch drag (activation constraints, `GroupDropTargets` tiles,
  `BoardTabStrip`'s long-press reorder) needs a real device/emulator to verify
  (`npm run android`) — not exercisable from a resized browser window per `CLAUDE.md`'s
  native-vs-web platform-detection rule.

## Group Settings (`/power-tools/groups/:groupId`, `GroupSettingsPage.tsx`)

Reached via the gear icon on a group's row in Power Tools. Fields, all auto-saving on
change (no Save button — see `feat-power-tools.md` for why that's the pattern
throughout this app):

- **Sorted By** — `manual | alphabetical | date | priority`. Controls note order
  within *this* group only. Groups themselves are ordered by their own `position`,
  which is now drag-reorderable from the board itself — see "Drag-and-drop" above —
  there's no separate order control here in Group Settings.
- **On Check Move To** — `none` or any other group in the same workspace
  (`useGroupSettings.ts`'s `siblingGroups`, `getGroupById`'s workspace filtered to
  exclude the current group — cross-workspace targets aren't offered). When set, a note
  in this group auto-relocates to the target group, appended at the end of it, the
  moment it becomes fully checked — see `feat-notes.md`'s "On Check Move To" section for
  exactly what "checked" means per note type. **One-directional**: unchecking a note
  later (or a counter dropping back below target, or unchecking a subtask) never moves
  it back — the user has to move it manually. Originally deferred to Phase 3 pending
  sync semantics; built in Phase 2 instead since the local-only move is simple enough
  not to need sync to land first (sync itself, when built, will just see it as a normal
  `updated_at`-newer row like any other edit).
- **Reset To Unchecked On Move** — `on` (default) / `off`. **Only rendered when "On
  Check Move To" is set to a real group** (`GroupSettingsPage.tsx`'s
  `{group.onCheckMoveToGroupId && (...)}` guard) — hidden otherwise, since it's
  meaningless without an active move rule. Controls whether the note arrives unchecked
  in its destination (`on`) or keeps showing checked/done there (`off`) — see
  `feat-notes.md`'s "On Check Move To" section. Backed by the `groups.reset_on_move`
  column (`INTEGER NOT NULL DEFAULT 1`), added via an explicit `ALTER TABLE` migration
  in `sqlite.ts`'s `migrateSchema` rather than just the `CREATE TABLE IF NOT EXISTS` —
  this schema has no version tracking, so a plain `IF NOT EXISTS` is a no-op against an
  already-created local `groups` table; see that file's `ensureColumn` for the
  idempotent-`ALTER TABLE` pattern this is the first user of.
- **Note Colors** — `manual | priority`. See `feat-notes.md` for exactly how each mode
  resolves a note's displayed color (`manual` auto-assigns a random swatch at note
  creation, then leaves it user-editable — the old separate `random` mode was folded
  into `manual` rather than kept as a third option).
- **Delete This Group** — `ConfirmDialog` → cascading soft-delete of the group and its
  notes → back to Power Tools.

New groups default to `sortedBy: 'manual'`, `noteColorMode: 'manual'`,
`onCheckMoveToGroupId: null` (`createGroup`, `src/lib/db/groups.ts`; mirrored in
`seedIfEmpty`'s first-run groups in `sqlite.ts`) — matching what a freshly created
group's Group Settings screen shows. `migrateSchema` (`sqlite.ts`) rewrites any
pre-existing `note_color_mode = 'random'` rows to `'manual'` so older local databases
stay valid after `random` was removed from the `NoteColorMode` type.

## Group rename

The group name heading at the top of Group Settings (both platforms) is directly
editable — a plain `<input>` styled as the `<h1>` it replaces, not a separate rename
dialog like the workspace switcher's. On mobile it is centred above "Group settings"
(the input carries its own `text-center`; an `<input>` doesn't inherit `text-align` from
the centred header around it). On desktop it is left-aligned. Auto-saves on blur (`useGroupSettings.ts`'s
`updateName` → `updateGroup`'s already-generic `name` column update — the DB layer
never actually needed a change, only the UI was missing), same "no Save button, save on
blur" convention as every other field on this page (`docs/feat-power-tools.md`).
Uncontrolled (`defaultValue` + `onBlur`, `key={group.id}` to reset it when navigating to
a different group) rather than a controlled `value`/`useState` pair kept in sync via a
`useEffect` — same pattern `NoteEditorPage.tsx`'s counter Step/Target inputs already
use, and it sidesteps a `setState`-in-`useEffect` lint error a naive controlled version
hits. Blurring with an empty/all-whitespace value reverts the input back to the
current name instead of saving an empty group name (the DB column is `NOT NULL`, and an
empty group name has no equivalent to a note's "no title yet" convention, since a group
already exists in the DB the moment this page can be reached).
