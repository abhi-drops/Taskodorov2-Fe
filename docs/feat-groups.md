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
