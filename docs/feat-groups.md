# Feature: Groups

Groups are the board's columns (mobile: tabs) — fully user-customizable, not a fixed
Todo/In Progress/Completed enum, even though those three are what the first-run seed
creates.

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
- **On Check Move To** — rendered, **disabled**, "none" only. The field exists on the
  `groups` row (`on_check_move_to_group_id`) but has zero runtime effect — real
  behavior (auto-moving a note to another group when checked) is explicitly deferred to
  Phase 3, since it needs sync semantics to track the move as a change.
- **Note Colors** — `manual | random | priority`. See `feat-notes.md` for exactly how
  each mode resolves a note's displayed color.
- **Delete This Group** — `ConfirmDialog` → cascading soft-delete of the group and its
  notes → back to Power Tools.

## No group rename

Deliberately out of scope, despite workspaces having gotten rename via their switcher.
Neither the Power Tools mockup nor the Group Settings mockup shows any rename
affordance for a group anywhere — the group's name is only ever set at creation.
