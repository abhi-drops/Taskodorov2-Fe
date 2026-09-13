# Feature: Search & Filter

`/search` (`SearchPage.tsx` + `common_logics/useSearchFilter.ts`) — a read-only,
cross-group view over the active workspace's notes. The last piece of Phase 2; renders
results with the exact same `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` components
the board uses (see `feat-notes.md`) — no separate note-rendering logic.

## Two things that look alike but aren't

Re-examining the mockup closely surfaced a real ambiguity worth remembering:

- **The bottom tab row (`All`/`Todo`/`In Progress`/`Completed`) filters by *group*, not
  status.** It's the exact same single-select `Tabs` component the board uses,
  generated from `listGroups` with an "All" option prepended. "Todo"/"In
  Progress"/"Completed" are just this workspace's actual (renameable) group names —
  easy to misread as a fixed status enum since they happen to match the seeded
  defaults.
- **The separate "Status" filter section** (`Completed`/`Incomplete` chips) is the
  actual note-level `completed` field — unrelated to the tab row above.

## Filters

`Status`, `Priority`, `Color` — all independently **multi-select** (unlike the
single-select group tab row), toggled via a "Filter ⌄/⌃" expand button. Applied in
order: search text (title substring, case-insensitive) → group scope → status → priority
→ color, each only narrowing results if that filter has ≥1 value selected.

- **Priority has exactly 3 chips: High/Medium/Low — no "Normal."** Matches the mockup
  exactly rather than adding a 4th chip it doesn't show. Consequence: since `normal` is
  most notes' default priority, selecting *any* priority chip excludes normal-priority
  notes from the results — there's no way to explicitly include them once a priority
  filter is active. A real, intentional limitation of following the mockup precisely,
  not a bug.
- **Color filtering uses each note's *resolved* color**
  (`lib/notes/resolveNoteColor`), not the raw `note.color` field — otherwise filtering
  by color would silently disagree with what's actually rendered on a group set to
  `noteColorMode: 'priority'`. Verified specifically against that mode during testing.
- Color chips are **not** the shared `SwatchPicker` component — that's single-select by
  design (radiogroup semantics, built for "pick one note color"), which doesn't fit
  "filter by any of several colors." Small inline multi-select circles instead, reusing
  `SWATCH_CLASSES` from `components/ui/swatchColors.ts` for identical styling.

## Desktop layout: 3/4-width search+filters, bento results grid

`SearchPage.tsx` gained an `lg:` breakpoint (same pattern as `NoteEditorPage.tsx`):
outer container widens to `lg:max-w-6xl`. The search input, "Filter" toggle, the
expanded filter panel, and the group-scope `Tabs` row span the same full width as the
results grid below — an earlier version constrained this cluster to a centered 3/4
width, which read as visually misaligned against the full-width grid once seen
side-by-side, so it was widened to match rather than narrowing the grid to fit (the
grid needs the room for a comfortable 3-column bento layout). The "Filter" toggle
keeps its collapsible behavior unchanged on desktop (no always-expanded variant) —
same interaction as mobile, just wider when open. The filter panel's background also
migrated from `shadow-lg` to `shadow-card`, per `docs/style-guide.md`'s note that this
page was "next in line" for that.

Results render as a bento/masonry grid at `md:`/`lg:` instead of a single vertical
list — note cards vary a lot in height (a list note's `<ul>` scales with item count,
uncapped; basic/counter cards are comparatively bounded, see `feat-notes.md`), so a
strict equal-height grid would waste space. Built with plain CSS multi-column layout,
no JS masonry library: `md:block md:columns-2 lg:columns-3 lg:gap-4` on the results
container (the `md:block` is required — `columns-*` has no effect on a `flex`
container, and the container is `flex flex-col` for the mobile single-list case), each
card wrapped in a `<div>` carrying `md:mb-4 md:break-inside-avoid` for vertical
spacing and to stop a tall list-note card being visually split across a column break.
Trade-off accepted deliberately: CSS columns fill top-to-bottom column-by-column
(Pinterest-style), not strict left-to-right row order — a JS-measured masonry would
preserve row order but needs a `ResizeObserver`-driven balancing hook this app doesn't
have and didn't need for this page's scale.
