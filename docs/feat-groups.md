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

## Drag-and-drop

Built with `@dnd-kit/*`. Platform-specific by design (see `CLAUDE.md`'s web/mobile
split) since web shows all columns at once and mobile shows one group at a time via
tabs — dragging a note *between* groups is a fundamentally different gesture on each.

- **Notes**: draggable everywhere. Reorder-within-a-group only actually reorders
  (`common_logics/useBoard.ts`'s `moveNote`, persisted via `lib/db/notes.ts`'s
  `reorderNotes`) when that group's `sortedBy === 'manual'` — `GroupColumn.tsx` renders
  a non-sortable plain list otherwise, since a manual drop position would just be
  overridden by the sort rule on next render. **Dropping into a *different* group is
  always allowed regardless of its sort mode** — the note's `groupId` updates and it
  gets appended (`position` = current count in that group); the drop *position* is only
  honored when the destination is `manual`. No card-level drag handle — the whole card
  stays the click-to-edit target; dnd-kit's activation constraints (mouse: distance
  threshold, touch: long-press delay) keep a plain tap from being swallowed as a drag.
- **Groups/columns**: also draggable — web's column header chip and mobile's tab (see
  `components/BoardTabStrip.tsx`) are both sortable, persisted via
  `lib/db/groups.ts`'s `reorderGroups`. This is new: `position` used to only ever be
  set once at creation.
- **Mobile cross-group move**: mobile shows one group at a time, so there's no second
  column to drag onto. Instead, dragging a note *up onto a tab* and dwelling there
  (~550ms, `BoardTabStrip.tsx`'s `useDndMonitor`-based hit-testing against each tab's
  DOM rect — no dnd-kit droppable registration involved for this part, deliberately
  decoupled from the actual drop-target system) auto-switches the active group,
  revealing that group's list to drop the note into. This needs a real device/emulator
  to verify (`npm run android`) — not exercisable from a resized browser window per
  `CLAUDE.md`'s native-vs-web platform-detection rule.
- **Persistence**: `position` stays a dense per-group (or per-board, for groups)
  integer, reindexed to `0..n-1` on every drop via the bulk `reorderNotes`/
  `reorderGroups` helpers — no fractional/gap positions, since this is a local-only
  SQLite app with no merge/sync semantics to protect (see
  `docs/feat-offline-data-layer.md`).

## Group Settings (`/power-tools/groups/:groupId`, `GroupSettingsPage.tsx`)

Reached via the gear icon on a group's row in Power Tools. Fields, all auto-saving on
change (no Save button — see `feat-power-tools.md` for why that's the pattern
throughout this app):

- **Sorted By** — `manual | alphabetical | date | priority`. Controls note order
  within *this* group only (groups themselves are always ordered by their own
  `position`, not user-configurable order-of-columns yet).
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
