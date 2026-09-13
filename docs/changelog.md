# Changelog

All notable changes to Taskodoro-Fe. Newest first. Entries are a log of *what changed
and when* — for *how a feature works*, see the relevant `docs/feat-*.md` file linked
from each entry. See `CLAUDE.md` for the rule on keeping this updated.

## 2026-09-13 — "Reset To Unchecked On Move" is now a per-group toggle (default on)

Follow-up to the entry below: the unchecked-on-arrival reset is now optional, not
forced. New Group Settings field "Reset To Unchecked On Move" (`on`/`off`, default
`on`), rendered **only** when "On Check Move To" targets a real group — meaningless
otherwise, so hidden rather than shown-disabled. Turning it off keeps a moved note
showing checked/done in its destination, restoring the pre-reset behavior on a per-
group basis.

- New `groups.reset_on_move` column (`INTEGER NOT NULL DEFAULT 1`). Since this schema
  has no version tracking (`sqlite.ts`'s `SCHEMA_SQL` is `CREATE TABLE IF NOT EXISTS`
  only), a plain schema-string edit wouldn't reach already-created local databases —
  added `migrateSchema()`/`ensureColumn()` (idempotent `ALTER TABLE`, guarded by a
  `PRAGMA table_info` check) as the first use of an actual migration step in this repo.
- `useGroupSettings.ts` gained `updateResetOnMove`; `GroupSettingsPage.tsx`'s new
  `Select` only renders inside the existing `onCheckMoveToGroupId` conditional.
- `applyOnCheckMove` now returns `{ destGroupId, reset } | null` (was `string | null`)
  so callers know whether the reset actually happened; `useNoteForm`'s `syncAfterMove`
  only mirrors the local unchecked-state reset when `reset` is true.

See `docs/feat-groups.md`'s Group Settings section and `docs/feat-notes.md`'s "On Check
Move To" section.

## 2026-09-13 — "On Check Move To" now resets the note to unchecked on arrival

Reported as: a note that auto-moves to its destination group was still showing checked
there. That was the original design (move a "done" note as-is), but the intended
behavior is Kanban-style — checking a note moves it to the next group as a fresh,
unchecked item, ready for whatever happens there next (and lets rule chains across
several groups actually fire, rather than needing a manual uncheck/recheck first).

- `onCheckMove.ts`'s `applyOnCheckMove` now also applies a `buildResetPatch`: basic/
  counter reset `completed` to `false` (value/target left alone for counters — only the
  checkmark resets); list resets every subtask's `completed` to `false`.
- `useNoteForm`'s `syncAfterMove` (renamed from `syncGroupAfterMove`) now also mirrors
  that reset into local `completed`/`payload` state, so a note editor left open across
  the move doesn't keep showing it as checked.

See `docs/feat-notes.md`'s "On Check Move To" section.

## 2026-09-13 — Fix: re-checking a note in the editor after an "On Check Move To" move used the stale source group's rule

Follow-up to the entry below. `useNoteForm` loads `group` once at mount and never
refreshed it — so checking a note in the editor (triggering a move), then unchecking
and re-checking it without leaving that editor page, would re-fire the *original*
group's move rule instead of the *destination* group's own rule (relevant once groups
chain: A moves to B, B moves to C). Unchecking itself was always already a no-op
(`applyOnCheckMove` only ever fires forward), so this only affected the immediate
re-check case. `applyOnCheckMove` now returns the destination group id on an actual
move; `useNoteForm` uses it (`syncGroupAfterMove`) to refresh local `group`/
`resolvedGroupId`. See `docs/feat-notes.md`'s "On Check Move To" section.

## 2026-09-13 — "On Check Move To" group rule is now functional

Previously a visible-but-disabled dropdown (deferred in the Phase 2 plan pending sync
semantics). Now: a group's Group Settings dropdown picks any other group in the same
workspace, and a note auto-moves there the moment it becomes fully checked (own
checkmark for basic/counter — counter's already folds in target-reached auto-complete —
or every subtask checked for a list note). One-directional: unchecking later never
moves it back. See `docs/feat-notes.md`'s new "On Check Move To" section and
`docs/feat-groups.md`'s Group Settings section for the full behavior.

- New `src/lib/notes/onCheckMove.ts`: `isNoteFullyChecked` (type-dependent "checked"
  definition) and `applyOnCheckMove` (fires the move on a false→true transition,
  appending the note to the end of the destination group).
- Wired into every place a note's checked-ness changes: `BasicNoteCard`/
  `CounterNoteCard`/`ListNoteCard` (board + search results) and `useNoteForm`'s
  `toggleCompleted`/`toggleItem` (note editor).
- `useGroupSettings.ts` gained `siblingGroups` (same-workspace groups, excluding the
  current one) and `updateOnCheckMoveTo`; `GroupSettingsPage.tsx`'s dropdown is no
  longer hardcoded/disabled.

## 2026-09-13 — Board: checklist item checkbox now top-aligns on wrapped subtasks

`ListNoteCard.tsx`'s per-item row used `items-center`, so a long subtask that wraps
across several lines (now possible after the previous entry's multiline editing
support) centered the checkbox vertically against the whole wrapped block instead of
aligning it with the first line — inconsistent with `BasicNoteCard`/`CounterNoteCard`,
which both use `items-start` for their checkbox row. Switched to `items-start` (with a
small `mt-0.5` on the checkbox to match its first line optically), consistent with
every other note-card checkbox in the app.

## 2026-09-13 — Subtask items are directly editable, with multiline support

List-note checklist items could previously only be added/toggled/removed, never
edited — fixing a typo meant deleting and re-adding the item. See
`docs/feat-notes.md`'s "Create/edit" section for the full behavior.

- `common_logics/useNoteForm.ts` gained `updateItemText(id, text)` (local-state-only,
  called on every keystroke) and `handleItemTextBlur(id)` (trims and persists on
  blur; clearing an item's text and blurring deletes it, matching the note title's
  "empty = doesn't exist" convention).
- `NoteEditorPage.tsx`: each item's text is now an always-editable `<textarea>` (click
  in and type — same inline-edit pattern as the title/description, no separate edit
  mode), with multiline auto-grow via the same resize approach already used for
  title/description (extracted into a plain `autoGrow()` function since a dynamic
  list of items can't each call a hook). Item rows switched to `items-start` so
  wrapped text doesn't push the checkbox to the row's vertical middle.
- The "new item" input is now a multiline `<textarea>` too: Enter still adds the item
  (unchanged), Shift+Enter inserts a line break first so a multi-line subtask can be
  composed before submitting.

## 2026-09-13 — Mobile board remembers the active group tab across navigation

Fixed the mobile board's active group tab (the `Tabs`-switched single-column view)
resetting to the workspace's first group every time `HomePage` remounts — e.g. opening
a note and returning to Home via the Android hardware back button/edge-swipe gesture
added earlier. See `docs/feat-groups.md`'s new "Active tab survives navigating away
and back" section.

- `common_logics/useBoard.ts`'s `activeGroupId` now seeds from a module-level
  `lastActiveGroupId` instead of `useState(null)`, and every `setActiveGroupId` call
  writes through to it — `useBoard()` has exactly one call site (`HomePage`), so this
  needed no new Context or persistence layer. Deliberately in-memory only for this app
  session (resets on a full app restart/page reload), unlike the workspace selector's
  disk-persisted equivalent — not asked for here, and this fix already covers the
  reported case (and, as a side effect, every other path back to Home, not just the
  swipe gesture specifically, since the root cause wasn't gesture-specific).

## 2026-09-13 — Search page: desktop layout with a bento/masonry results grid

`SearchPage.tsx` had no desktop-specific layout at all — capped at `max-w-md` and a
single vertical list of results regardless of viewport. See
`docs/feat-search-filter.md`'s new "Desktop layout" section for the full behavior.

- Outer container widens to `lg:max-w-6xl` (matching `NoteEditorPage.tsx`'s
  convention); the search input, "Filter" toggle, filter panel, and group `Tabs` row
  keep the collapsible filter-toggle behavior unchanged from mobile. Folded in the
  filter panel's `shadow-lg` → `shadow-card` migration flagged as pending in
  `docs/style-guide.md`.
- Results switch from a single list to a bento/masonry grid at `md:`/`lg:`, since note
  cards vary a lot in height (list notes especially). Plain CSS `columns-2`/`columns-3`
  + `break-inside-avoid` per card, no new dependency — the container needed an
  explicit `md:block` alongside `md:columns-2`, since CSS `columns` has no effect on a
  `flex` container (the mobile-only base layout) without it.
- Follow-up: the search/filter cluster was initially constrained to a centered 3/4
  width, but that looked misaligned against the full-width results grid once seen
  together — widened it to match the grid's full width instead of narrowing the grid.

## 2026-09-12 — Android hardware back button / edge-swipe now navigates instead of exiting

Fixed Android's hardware back button and the right-edge swipe-back gesture exiting the
app from every page instead of stepping back through in-app navigation history. See
`docs/feat-navigation.md`'s new "Android hardware back button / edge-swipe" section for
the full behavior.

- New dependency: `@capacitor/app`. Its `backButton` event fires for both the hardware
  button and the Android gesture-nav back swipe (both funnel through the same
  `Activity.onBackPressed()` → Capacitor bridge event on a `BridgeActivity`), so one
  listener covers both. Without a JS-side listener, Capacitor's default behavior is to
  exit the activity outright rather than walk router history — nothing in the app
  previously registered one.
- New `src/lib/platform/useAndroidBackButton.ts` hook (native-only, gated on
  `usePlatform().isNative`): calls `window.history.back()` when the native event
  reports `canGoBack`, since the router (`createBrowserRouter`) already uses real
  browser history; otherwise — always Home, since the app boots at `/` — arms a ~2s
  "press back again to exit" window before calling `App.exitApp()`.
- New `src/components/ui/ExitToast.tsx`, the "Press back again to exit" confirmation
  banner, wired into `AppShell.tsx` globally so it's available on every route.

## 2026-09-12 — Note editor: swatch-colored items + desktop two-column layout

Fixed the note editor (`NoteEditorPage.tsx`) rendering checklist items and the
"new item" row as plain transparent boxes instead of picking up the note's
selected swatch color, and made the page use the extra width on desktop
instead of staying capped at a phone-width single column. See
`docs/feat-notes.md`'s "Create/edit" section for the current shape.

- The checklist items and the "new item" input are now one continuous
  swatch-colored block (`SWATCH_CLASSES[color]` background, `border-2
  border-ink`, `shadow-card`) wrapping all rows, rather than each item/the
  input having its own separate border and padding — matches the read-only
  `ListNoteCard.tsx`'s solid-color-block treatment instead of rendering with
  no background at all. The item remove "×" button moved from a hardcoded
  `text-sticky-coral` to `text-ink` so it stays legible regardless of which
  swatch color the note itself uses.
- `SwatchPicker.tsx`'s disabled state (shown when a group's `noteColorMode`
  isn't `manual`) no longer dims the swatches to `opacity-50` — the four
  colors always render at full opacity; disabling is communicated purely by
  the buttons not responding to input.
- `NoteEditorPage.tsx`'s outer layout gained an `lg:` breakpoint that splits
  it into a 40/60 two-column grid on wide/desktop viewports (left: title/
  description + items/counter-config, right: type/color/priority/delete),
  capped at `max-w-6xl` rather than the much narrower `max-w-4xl` so it
  actually uses the available desktop width instead of sitting in a
  cramped centered column, while still not stretching edge-to-edge on very
  large monitors. Collapses back to the existing single column below `lg:`
  — same JSX for every platform, no `isNative` branch, since this is an
  ordinary responsive reflow rather than a platform difference. The two
  columns are vertically centered against each other (`lg:items-center`)
  with a wider `lg:gap-12` between them.
- Follow-up pass on the same page: the title is now a `textarea` that grows
  with content with no line cap (was a single-line `<input>` that silently
  overflowed/clipped long text — see `useAutoGrowHeight` in
  `NoteEditorPage.tsx`); the description grows the same way but caps at
  `max-h-[210px]` (~10 lines) and scrolls internally beyond that. The items
  block dropped its `border-ink` outline (kept `shadow-card`) and got a
  bigger `gap-4` between rows, with the checkbox now flush against the
  block's left edge (`pr-4`/no left padding, container `rounded-card` is
  `0px` per the design system so nothing clips). The "Add" control became a
  small square `+` icon button (`font-display`) instead of a full-width
  labeled `Button`. Counter-type notes now get the same swatch-colored
  config block as list notes, in the same left-column slot (was plain
  white fields in the right column).
- Third follow-up: the right column's controls (Note Type/Color/Priority/
  Delete) no longer stretch to fill the full 60% grid track — wrapped in a
  `mx-auto max-w-xs` inner block so they're horizontally centered within the
  track instead of spanning it edge to edge. The counter Step/Target inputs
  switched from a transparent background to `bg-white` (previously blended
  into the swatch-colored block behind them). The "new item" input gained
  `pl-3` so its text/placeholder isn't flush against the block's left edge
  the way the checkbox rows intentionally are.

## 2026-09-03 — Kanban drag-and-drop for the board

Added drag-and-drop to the board, native to each platform's interaction model rather
than one shared widget — see `docs/feat-groups.md`'s "Drag-and-drop" section for the
full behavior:

- New dependency: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- `lib/db/notes.ts`/`lib/db/groups.ts` gained `reorderNotes`/`reorderGroups` bulk
  position-reindex helpers (same `withDb` pattern as the existing CRUD functions);
  `common_logics/useBoard.ts` gained `moveNote`/`reorderGroups` actions that optimistic-
  update local state then persist.
- New `common_logics/useBoardDnd.ts` (sensors + `onDragEnd` routing, shared by both
  platforms) and `components/BoardTabStrip.tsx` (mobile-only tab strip, doubles as a
  sortable chip for group reordering).
- `GroupColumn.tsx` notes are drag-sortable when their group is `sortedBy: 'manual'`,
  and a plain (non-reordering) drag source in every other group so they can still be
  moved to a different group regardless of sort mode; always droppable (a note dropped
  into a non-manual group is appended, positioned by that group's own sort rule, not the
  drop point). Web's column header chip is itself draggable for column reordering.
- Mobile cross-group move went through a redesign after the first version (drag a note
  onto a tab, dwell to auto-switch) proved unreliably fussy on a real Android device —
  small multi-purpose touch target, custom geometry hit-testing, missing
  `touch-action: none` racing the WebView's native scroll. Replaced with
  `components/GroupDropTargets.tsx`: starting a note drag swaps the tab strip for a row
  of large "drop here" tiles (one per other group) using plain dnd-kit `useDroppable`
  collision detection — no custom timers or hit-testing. Also widened the touch
  sensor's activation tolerance (a resting finger drifts more than a mouse).
- On mobile, a successful cross-group note drop now switches the active tab to the
  destination group (`useBoardDnd`'s new `onNoteMovedToGroup` option, wired in
  `HomePage.tsx`) so the note's new location is immediately visible.
- Fixed vertical scrolling being completely broken on a group's note list on mobile:
  the note cards' `touch-action: none` (added for reliable touch drag) disabled the
  browser's native scroll for any touch starting on a card — nearly the whole list.
  Switched to `touch-action: manipulation`, which was sufficient all along since
  activation here is delay-based (long-press), not distance-based.
- Note: mobile's touch drag-activation behavior still needs a real device/emulator to
  verify (`npm run android`) — not exercisable from a resized browser window, per this
  repo's native-vs-web platform-detection rule.

## 2026-08-28 — Board & note-card visual rework (2.7)

Restyled the board/home screen to match a Penpot design export pixel-for-pixel, replacing
the earlier generic Tailwind-defaults look:

- New `--color-ink`/`--shadow-card` tokens and `--radius-card: 0px` (square corners) in
  `src/index.css`; `--color-sticky-*` repointed to the reference's exact hex values.
- `GroupPanel` extracted out of `HomePage.tsx` into its own `src/components/GroupColumn.tsx`,
  which now renders each column as a light backdrop card behind the notes with the header
  chip intentionally overlapping its top edge, and dropped the always-on progress bar (never
  shown in the reference's default view).
- `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` moved to the new hard-edged `shadow-card`
  treatment; `ListNoteCard` is now two stacked rectangles (title strip + indented checklist
  body) to match the reference's notched shape; `CounterNoteCard`'s `+`/`−` control reordered
  to match the reference.
- `TopNav` gained a matching backdrop card; `AppShell` gained `headerStart`/`headerEnd` slots
  so `HomePage` can merge the workspace switcher + search icon into the same row as the nav
  pill on web.
- `CheckCircle`'s checked-tick overlay reworked to a deliberately oversized, proportionally-
  positioned "stamp" (scales correctly at every call-site size); fixed a Tailwind preflight
  `max-width: 100%` clamp that was silently squashing the enlarged tick.

Full details, including two things that look like bugs but aren't (the group column's
negative-margin overlap, and the list note's two-piece shape) and the one real gotcha
(`max-w-none` needed on any oversized absolutely-positioned icon): `style-guide.md`.

## 2026-08-26 — Documentation pass

- Added per-feature docs: `feat-auth.md`, `feat-offline-data-layer.md`,
  `feat-navigation.md`, `feat-workspaces.md`, `feat-groups.md`, `feat-power-tools.md`,
  `feat-notes.md`, `feat-search-filter.md`, `style-guide.md`.
- Added this changelog.
- Updated `CLAUDE.md`: refreshed the architecture section for Phase 2 (it previously
  only described Phase 1's auth-only app), added the changelog-maintenance rule.

## 2026-08-26 — Verified native SQLite on a real Android device (`165f2c8` + on-device testing)

No code change — verification only, prompted because native SQLite behavior had never
actually been exercised (browser-based testing can't reach the native code path in
`lib/db/sqlite.ts`; `Capacitor.getPlatform()` is always `'web'` in a browser, by
design). Built + installed on a connected physical device, created data, force-stopped
and relaunched the app, confirmed data survived with clean `adb logcat` output. See
`feat-offline-data-layer.md`.

## 2026-08-26 — Phase 2.6: Search & filter (`1d7e17b`)

`useSearchFilter.ts` + `SearchPage.tsx`. Read-only cross-group search + Status/
Priority/Color filters over the active workspace's notes, reusing the note card
components from 2.5. See `feat-search-filter.md`.

## 2026-08-26 — Phase 2.5: Note CRUD + board rendering (`4da912b`)

The core CRUD surface: 3 note types (basic/counter/list), create/edit/delete, inline-
editable auto-saving editor, board rendering via `BasicNoteCard`/`CounterNoteCard`/
`ListNoteCard`. Added `resolveNoteColor` (manual/random/priority color modes) and
`counterLogic` (auto-complete-at-target). See `feat-notes.md`.

## 2026-08-26 — Phase 2.4: Group CRUD + Power Tools (`dbaa462`)

Real group management: board tabs/columns show actual groups, `GroupSettingsPage`
(Sorted By/On Check Move To/Note Colors/Delete), `PowerToolsPage` extended with Groups
list + Addon Tools + Reset to Default. Added the `ConfirmDialog` shared primitive once
destructive confirmations crossed 3 call sites, and `danger` as a `Button` variant. See
`feat-groups.md`, `feat-power-tools.md`.

## 2026-08-26 — Phase 2.3: Workspaces (`666e8ae`)

`WorkspaceContext` (mirrors `lib/auth/`'s 4-file shape) + `WorkspaceSwitcher` UI
(web: dropdown, mobile: bottom sheet) — no mockup existed for this, designed inline.
See `feat-workspaces.md`.

## 2026-08-26 — Phase 2.2: Guest-first routing (`80aa860`)

Dropped the forced auth gate on `/` — the app opens straight to the board for
everyone. Added the `/search`, `/power-tools`, `/notes/*` routes (as stubs, filled in
by later sub-phases) and `AppShell`/`TopNav`/`BottomNav` wiring. `ProtectedRoute`
stays in the codebase, unused, for Phase 3. See `feat-navigation.md`.

## 2026-08-26 — Phase 2.1 + 2.0: Offline data layer + design system (`165f2c8`)

Bundled together: the SQLite local data layer (`lib/db/{sqlite,workspaces,groups,
notes}.ts`, schema + CRUD + first-run seed) and the design system foundation
(self-hosted fonts, grid background, the `components/ui/*` primitive set:
`Select`/`Modal`/`CheckCircle`/`Tabs`/`SwatchPicker`/`ProgressBar`/`Icon`/`TopNav`/
`BottomNav`). See `feat-offline-data-layer.md`, `style-guide.md`.

## 2026-08-26 — Consolidated reference doc (`33b7349`)

Added `docs/Taskodoro-Project-Reference.md` and `docs/phase2-offline-first-plan.md` —
the planning docs Phase 2's sub-phases were built from.

## 2026-08-25 — `CLAUDE.md` + local test command (`79d9b8c`)

## 2026-08-25 — SSO: Android (`e62dcad`) and Web (`37a03ea`)

Phase 1: manual email/password + Google Sign-In, on both platforms. At this point
`/` was gated behind `ProtectedRoute` — auth was mandatory to use the app at all, later
changed in Phase 2.2. See `feat-auth.md`.

## 2026-08-25 — Initial commit (`7cd4777`, `baf8556`)

Project scaffold: Vite + React 19 + TypeScript + Capacitor, Tailwind v4 design tokens.
