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

- **`manual`** — a random swatch is assigned **once at creation time** (rolled when the
  new-note form loads, frozen into `note.color` on save — doesn't reshuffle on reload),
  and the picker stays enabled so the user can override it at any point afterward.
  (Before this was consolidated, "random-then-frozen-with-picker-disabled" and
  "user-picks-freely" were two separate modes, `random` and `manual`; `random` no
  longer exists as its own mode — `manual` now does both halves of that job.)
- **`priority`** — **ignores `note.color` entirely**, derived live from `note.priority`
  via a fixed map (`PRIORITY_COLOR_MAP`: high→coral, medium→yellow, normal→blue,
  low→green — no mockup dictates this exact mapping, chosen as a reasonable default).
  If the note's priority changes later, its color updates automatically. Picker
  disabled (and dimmed, `opacity-35` — see `style-guide.md`) in the editor, which also
  shows a small callout under it: "Color is set by priority for this group."

Every consumer of a note's color (board cards, search results, the editor's preview)
calls `resolveNoteColor(note, group)` — never reads `note.color` directly, since that
would be wrong under `priority` mode. `resolveNoteColor` takes `Pick<Note, 'color' |
'priority'>` rather than a full `Note` specifically so `NoteEditorPage.tsx` — which
holds these as separate form fields, not an assembled `Note` — can call it too; there
its card background and the (disabled, in `priority` mode) swatch picker's highlighted
color both come from `resolveNoteColor`, so they stay in sync with the Priority
`<Select>` live, with no save/reload needed.

## Statuses (`src/lib/notes/noteStatus.ts`)

Any note (all 3 types) can carry a list of free-text status entries — `NoteStatus {
id, text, createdAt }`, stored as `note.statuses`, its own top-level DB column
(`statuses TEXT NOT NULL DEFAULT '[]'`) rather than living inside `payload`. This is
deliberately separate from `ListPayload.items`: items are `list`-type-specific,
statuses apply across `basic`/`counter`/`list` alike, so they couldn't share
`payload`'s type-specific slot. `NoteStatus` has no edit timestamp — `createdAt` is set
once at creation and never touched by a later text edit; "latest" is always just the
entry with the highest `createdAt` (`getLatestStatus`), not array/insertion order.

**Editor CRUD** (`NoteEditorPage.tsx` + `useNoteForm.ts`'s `addStatus`/
`updateStatusText`/`handleStatusTextBlur`/`removeStatus`) reuses the exact convention
`list`-type items already established (see "Create/edit" below): always-editable
`<textarea>` rows, click-and-type with no separate edit mode, text changes persist
(trimmed) only on blur, and blurring an entry to empty text deletes it instead of
persisting empty. The whole Status block is gated behind `!form.isNew` — same reasoning
as the Delete button — since a status needs a real note id to attach to, and a
brand-new note isn't written to the DB until its title is non-empty. The editor lists
existing statuses newest-first (`sortStatusesNewestFirst`), each showing its text and a
formatted created date/time (`formatStatusTimestamp`, the app's first date-formatting
helper — plain `Intl.DateTimeFormat`, no library).

Unlike the adjacent list-items/counter-config blocks (which use the note's own swatch
color as their background, per "Create/edit" below), the Status block's own background
is always `bg-ink` — the same dark token `NoteStatusStrip` uses on the board — with all
of its text, timestamps, and the add (`+`)/remove (`×`) icons tinted to the note's
swatch color (`SWATCH_TEXT_CLASSES`) and `font-semibold`, so the block visually pairs
with the board strip rather than blending into the preview card like the other
type-specific config blocks do. The "New status" input's placeholder uses a matching
`SWATCH_PLACEHOLDER_TEXT_CLASSES` map (kept as its own set of full literal
`placeholder:text-sticky-*/60` strings in `swatchColors.ts`, not built by concatenating
a variant prefix onto `SWATCH_TEXT_CLASSES` at the call site — Tailwind's content
scanner needs the complete class string to appear literally in some scanned file to
generate its CSS, and a runtime-only template-literal concatenation wouldn't). The add
button's border uses the static `border-current` utility rather than a fourth
swatch-color map, since its color already matches the `+` glyph's `text-*` class.

**Gotcha:** the existing-status `<textarea>` must not be given `flex-1` inside its
`flex-col` wrapper (the column that also holds the timestamp caption) — in a
column-direction flex container, `flex-1` governs the item's *height*, which fights the
manual `autoGrow`-via-inline-`height` technique used for auto-growing textareas
throughout this page (the flex algorithm collapses a `flex-basis: 0%` item back toward
min-content height regardless of the inline height autoGrow sets, when the container's
own height is otherwise intrinsic). Use `w-full` there instead — the textarea doesn't
need vertical flex-grow, its height is entirely content-driven. `list`-type items don't
have this problem since their row is a flex *row*, where `flex-1` only affects width.

**Board rendering**: `components/ui/NoteStatusStrip.tsx` is a shared component rendered
as the last child of all three `*NoteCard.tsx` components (and, since `SearchPage.tsx`
reuses those same cards, search results too) — a full-width `bg-ink` footer strip
showing only the note's latest status, or nothing at all if the note has none. The
status text itself is `font-semibold` and tinted to the note's own resolved swatch
color (`SWATCH_TEXT_CLASSES` in `swatchColors.ts`, the `text-sticky-*` counterpart to
the existing `bg-`/tint variants) rather than a fixed gray, so the strip reads as
belonging to its card even though the strip's own background is always the same dark
`ink`. Short text sits static and right-aligned (`truncate`); text that overflows one line
auto-scrolls instead (`.animate-marquee` in `src/index.css`) — overflow is measured in
JS against a hidden, undoubled copy of the text (measuring the animated/duplicated
markup directly would always read as overflowing), so short statuses never animate
unnecessarily. **That hidden measurement `<span>` is `position: absolute` and its
container div must carry `relative`** — without it, the span escapes to the document's
initial containing block instead of being scoped to the container's own
`overflow-hidden`, and since `visibility: hidden` elements still occupy layout space, a
long status's un-wrapped width inflates the whole page's scrollable width (most visible
as a broken horizontal scroll on narrow/mobile viewports) rather than staying invisibly
clipped. Animation speed is `.animate-marquee` in `src/index.css`, currently `20s`
linear per-loop (tuned down from an initial `10s` — the first pass read as too fast to
comfortably follow). The strip is just part of the card's existing click target — clicking it
opens the editor like clicking anywhere else on the card, no `stopPropagation`.
`BasicNoteCard`/`CounterNoteCard` moved their padding off the outer card `<div>` onto a
new inner wrapper so the strip can sit flush, full-bleed, below it; `ListNoteCard`
needed no such change beyond an `ml-4` wrapper — its outer `<div>` was already a bare
wrapper around independently-styled full-width pieces (see its own section below), and
the strip becomes a natural third one, width-matched to the narrower, indented
checklist body directly above it (not the wider title strip) so the two bottom pieces
read as one continuous edge.

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
