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
