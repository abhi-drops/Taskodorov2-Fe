# Changelog

All notable changes to Taskodoro-Fe. Newest first. Entries are a log of *what changed
and when* — for *how a feature works*, see the relevant `docs/feat-*.md` file linked
from each entry. See `CLAUDE.md` for the rule on keeping this updated.

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
