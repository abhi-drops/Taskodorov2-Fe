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
`priority` → high→low. The group's `ProgressBar` is a simple complete/total count over
its notes (`note.completed`) — the mockups' "excluding notes with an active on-check-
move-to rule" variant is deferred to Phase 3 along with that feature itself.

Cards are drag-and-drop sources (reorder within a `manual` group, move to any group) —
see `feat-groups.md`'s "Drag-and-drop" section. This is unrelated to a list note's
per-item `position` mentioned above, which still has no reorder UI.
