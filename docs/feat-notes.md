# Feature: Notes

The core CRUD surface — 3 note types, create/edit/delete, rendered on the board and in
search results by the same card components.

## Types & payload shapes (`src/types/note.ts`)

- **`basic`** (labeled "Task" in the UI, matching the mockup's exact wording — the
  internal type value stays `'basic'`) — `payload: {}`. Has the checkmark-circle
  complete-toggle.
- **`counter`** — `payload: { value: number; step: number; target?: number | null }`.
  Has the checkmark-circle **and** +/- controls. Counters were originally proposed
  (in an early planning doc) to have no complete state at all, since the mockups show
  no checkmark on the counter card — that was overridden: counters get the checkmark
  *and* an optional `target`. When `value` reaches `target` via the +/- controls, the
  note auto-completes. **Auto-complete only ever sets `completed: true` forward, never
  auto-unsets** — a manual checkmark toggle always wins after that, and is a completely
  separate action from the target logic (`src/lib/notes/counterLogic.ts`:
  `adjustCounterValue`, `shouldAutoComplete`). Value is clamped at a floor of 0.
- **`list`** — `payload: { items: { id, text, completed, position }[] }`. **No
  card-level checkmark** — confirmed by comparing the mockups closely: the list
  (green) card only ever shows per-item checkboxes, unlike basic/counter which both
  have one in the card header. The note's own `completed` field stays unused for this
  type — nothing renders it. No drag-reorder of items (`position` exists for future
  use, not wired to any UI).

## Color resolution (`src/lib/notes/resolveNoteColor.ts`)

A note's *displayed* color depends on its owning group's `noteColorMode`:

- **`manual`** — the picker-set `note.color`, editable.
- **`random`** — also just `note.color`, but assigned **once at creation time** and
  frozen — doesn't reshuffle on reload. Picker is disabled in the editor.
- **`priority`** — **ignores `note.color` entirely**, derived live from `note.priority`
  via a fixed map (`PRIORITY_COLOR_MAP`: high→coral, medium→yellow, normal→blue,
  low→green — no mockup dictates this exact mapping, chosen as a reasonable default).
  If the note's priority changes later, its color updates automatically. Picker
  disabled in the editor.

Every consumer of a note's color (board cards, search results, the editor's preview)
calls `resolveNoteColor(note, group)` — never reads `note.color` directly, since that
would be wrong under `priority` mode.

## On Check Move To (`src/lib/notes/onCheckMove.ts`)

A group can be configured (Group Settings, see `feat-groups.md`) with an
`onCheckMoveToGroupId` — when set, a note in that group auto-relocates to the target
group the instant it becomes fully "checked". "Checked" is type-dependent
(`isNoteFullyChecked`):

- **`basic`** — its own checkmark.
- **`counter`** — its own checkmark, which folds in the target-reached auto-complete
  already described above — there's no separate "has it hit its target" check here,
  since that's exactly what already drives `note.completed` for counters.
- **`list`** — every subtask `completed` (and at least one subtask exists — an empty
  list is never "checked"). The note's own unused `completed` field is irrelevant here.

The move only fires on the **false → true transition** (`applyOnCheckMove`'s
`wasChecked`/`isChecked` pair, computed by every call site before/after its own
`updateNote` call) and is **one-directional** — unchecking later never moves the note
back, matching the group-settings doc's note. It's a no-op if the group's target points
at itself or at nothing (`none`). The note is appended to the end of the destination
group (a fresh `listNotesByGroup(destGroupId)` count, same pattern as `createNote`'s own
position calc) — its manual position within the *source* group, if any, isn't
renumbered, same as any other cross-group move.

**The note arrives unchecked** (`buildResetPatch`) — this is a Kanban-style move-to-
next-stage, not a "mark done and archive it checked" — so it's ready for whatever
happens in the destination group, not sitting there already showing complete:

- `basic`/`counter` — `completed` resets to `false`. A counter's `value`/`target` are
  left untouched; only the checkmark resets.
- `list` — every subtask's `completed` resets to `false` (id/text unchanged).

This reset is what makes a **chain** of "On Check Move To" rules across several groups
actually usable (A → B → C): if the note arrived in B still checked, it would need an
uncheck/recheck round-trip before B's own rule could ever fire.

**This reset is itself optional** — Group Settings' "Reset To Unchecked On Move"
(`group.resetOnMove`, default **on**), only shown once "On Check Move To" targets a real
group (see `feat-groups.md`). Turned off, a note keeps showing checked/done after
landing in its destination — `applyOnCheckMove` reads the *source* group's
`resetOnMove` at the moment the move fires and skips `buildResetPatch` entirely when
it's off; it returns `{ destGroupId, reset }` so callers know which happened (`reset`
mirrors that same flag) rather than assuming a reset always occurred.

Every place a note's checked-ness can change wires this in: `BasicNoteCard`/
`CounterNoteCard`/`ListNoteCard` on the board (and search results, which reuse the same
cards), plus `useNoteForm`'s `toggleCompleted`/`toggleItem` for the same actions taken
from inside the note editor. On the board the reset falls out for free on next render
(`onChange` → `useBoard`'s `refresh()` re-fetches from the DB). The note editor is the
one place that needed explicit handling, since it keeps `completed`/`payload`/`group` in
local state loaded once at mount: `applyOnCheckMove` returns the destination group id
when it actually moves the note, and `useNoteForm`'s `syncAfterMove` uses it to refresh
local `group`/`resolvedGroupId` (so a later re-check in the same session evaluates the
*destination* group's own rule, not stale source-group data) and to mirror the checked-
state reset locally, so an editor left open across the move doesn't keep showing the
note as checked.

## Create/edit (`NoteEditorPage.tsx` + `common_logics/useNoteForm.ts`)

One page/hook drives both `/notes/new?group=<id>` and `/notes/:id/edit`. **No Save
button** — title and description are edited inline directly on the colored card
preview and auto-save on blur; Note Type/Color/Priority/payload fields auto-save
immediately on change. This matches every other settings-style screen in the app (see
`feat-power-tools.md`).

**A new note is not written to the database until its title is non-empty.** Type,
color, priority, and payload edits made before that just update local component state;
the first non-empty title blur fires the actual `createNote(...)` call with whatever
state has accumulated by then, then the page navigates to `/notes/:id/edit` (replacing
history, so a refresh doesn't re-enter create mode). This means there's no
orphaned-draft cleanup to worry about — nothing exists in the DB to clean up.

Switching Note Type resets `payload` to that type's default shape
(`lib/db/notes.ts`'s `defaultPayload`). Delete is present in the editor (a `danger`
button → `ConfirmDialog`) despite not being visible in the specific mockup crop this
was built from — `docs/phase2-offline-first-plan.md`'s scope for Phase 2 explicitly
includes note delete, so it was added anyway.

The title and description auto-grow with content (`useAutoGrowHeight` in
`NoteEditorPage.tsx`, a small `useLayoutEffect` that resizes a `<textarea>` to its
`scrollHeight` on every value change) instead of a fixed-size `<input>`/`<textarea>`
that silently clipped or stayed empty space. Title has no line cap; description caps
at `max-h-[210px]` (~10 lines at `text-sm`) and scrolls internally past that.

For a list-type note, the checklist items and the "new item" input all live inside one
continuous container carrying the note's own `SWATCH_CLASSES[color]` background and
`shadow-card` (no border — the block deliberately doesn't use `border-ink` here, unlike
most other chrome-on-a-colored-card cases) — the same solid-color-block treatment
`ListNoteCard.tsx` uses on the board, rather than each row/the input having its own
separate border. Individual item rows are plain `flex items-center gap-2` with a
`gap-4` between rows, and the checkbox sits flush against the block's left edge (no
left padding — safe because `rounded-card` is `0px`, so there's no corner to clip
into). The "new item" input, unlike the checkbox rows, does get a small `pl-3` so its
text/placeholder isn't flush against that same edge. The item remove "×" uses
`text-ink` (not a hardcoded swatch color) so it stays legible against any of the four
note colors. The "Add" control is a small square `+` icon button (`font-display`,
bordered `border-ink`) rather than a full labeled `Button`, since it sits inline with
the input instead of needing its own row.

**Item text is directly editable, click-and-type** — same always-editable-textarea
pattern as the title/description, not a separate read/edit-mode toggle. Each item's
`<span>` is a `<textarea>` bound to `useNoteForm`'s new `updateItemText(id, text)`
(updates local state on every keystroke) / `handleItemTextBlur(id)` (trims and
persists on blur; **clearing an item's text entirely and blurring deletes it**, same
"empty = doesn't exist" convention as the note title). Item rows switched from
`items-center` to `items-start` (with `mt-0.5` on the checkbox/remove button) so
wrapped multi-line text doesn't force the checkbox to the vertical middle of a now-
taller row. Multiline auto-grow reuses the same resize trick as the title/description
(`autoGrow()`, extracted to a plain function in `NoteEditorPage.tsx` since a dynamic
list of items can't each call a hook) — applied via both a mount-time `ref` callback
(for existing multi-line text) and on every `onChange` (for live typing).

The "new item" input itself is also multiline-capable (a `<textarea>`, not an
`<input>`, using `useAutoGrowHeight` same as title/description since there's exactly
one of it): plain **Enter still adds the item** (matches the previous single-line
behavior); **Shift+Enter inserts a line break** first, so a multi-line subtask can be
composed before submitting.

Counter-type notes get an equivalent swatch-colored config block (the Step/Target
inputs, `border-2 border-ink` with an explicit `bg-white` — unlike the items block,
these stay opaque white rather than blending into the swatch color) in the same
left-column slot the items block uses for list notes — previously these were plain
white-bordered fields in the right-hand config column.

On `lg:` viewports and wider, the page splits into a 40/60 two-column grid instead of
one column: title/description + items/counter-config on the left (40%), Note Type/
Color/Priority/Delete ("config for note") on the right (60%), capped at `max-w-6xl`,
vertically centered against each other (`lg:items-center`) with `lg:gap-12` between
them. The right column's controls are further wrapped in a `mx-auto max-w-xs` block so
they're horizontally centered within that 60% track rather than stretched to fill it.
Below that breakpoint it's the same single column as before — this is a plain CSS
breakpoint, not an `isNative` branch, since both platforms should reflow the same way
at the same width.

## Board rendering (`components/ui/{Basic,Counter,List}NoteCard.tsx`)

Each card: clicking anywhere navigates to the editor **except** its interactive
controls (checkmark, +/-, item checkboxes), which call `stopPropagation()`. All three
mutate directly via `lib/db/notes.ts`'s `updateNote` and call an `onChange` callback to
refresh the caller's list — no editor round-trip needed for a quick toggle.

`useBoard.ts` sorts each group's notes per its `sortedBy` setting: `manual` → existing
`position`; `alphabetical` → title A-Z; `date` → `createdAt` descending (newest first);
`priority` → high→low. **No `ProgressBar` is actually rendered on the board** —
`components/ui/ProgressBar.tsx` exists as a generic primitive but has no call site
anywhere in the app (removed from `GroupColumn` in 2.7, see `style-guide.md`); an
earlier draft of this doc described a per-group complete/total `ProgressBar` and a
Phase-3-deferred "excluding notes with an active On Check Move To rule" variant of it,
neither of which reflects the current board — On Check Move To itself is built now
(see the section above), and there's simply no progress bar on a group to begin with,
so that exclusion question doesn't currently apply to anything on-screen. Revisit this
note if a group-level progress indicator is ever added back.

Cards are drag-and-drop sources (reorder within a `manual` group, move to any group) —
see `feat-groups.md`'s "Drag-and-drop" section. This is unrelated to a list note's
per-item `position` mentioned above, which still has no reorder UI.
