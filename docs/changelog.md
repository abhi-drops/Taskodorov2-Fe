# Changelog

All notable changes to Taskodoro-Fe. Newest first. Entries are a log of *what changed
and when* — for *how a feature works*, see the relevant `docs/feat-*.md` file linked
from each entry. See `CLAUDE.md` for the rule on keeping this updated.

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
