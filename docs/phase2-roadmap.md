# Taskodoro Phase 2 — Implementation Roadmap

Session date: 2026-08-26. This doc breaks Phase 2 into ordered, independently-buildable
sub-phases so a future session can be pointed at a single numbered section (e.g. "build
2.3") and start immediately, without re-deriving the decisions already made here.

**Source of truth for the data model:** `docs/phase2-offline-first-plan.md` (Workspace/
Group/Note field tables, note-color resolution logic, ID/soft-delete/sync-readiness
design). **Source of truth for visuals/UX:** `docs/Taskodoro-Project-Reference.md` §10
plus the 5 Penpot mockup exports under `docs/design-references/{mobile,web}/`. This doc
does not repeat that content — it sequences the work and records the handful of
decisions from the 2026-08-26 planning session that supersede or extend those two docs.

> **Status (2026-09-19): all 7 sub-phases below (2.0–2.6) are complete**, plus a large
> amount of work built afterward that this roadmap never scoped — visual reworks,
> drag-and-drop, Android back-button handling, and several items this doc's own
> "explicitly out of scope" table originally deferred to Phase 3 (notably "On Check Move
> To" actually moving notes, now implemented). See **"Beyond this roadmap"** near the
> bottom for a dated, linked index of everything built past 2.6 — check there first
> before assuming something below is still pending. `docs/changelog.md` is the full
> authoritative log; that new section is a curated map into it.

---

## Decisions locked in this session

These override or extend `phase2-offline-first-plan.md` where noted. Treat as settled —
do not re-litigate when building a sub-phase, unless something concrete surfaces during
implementation that makes one of these actively wrong.

1. **Storage engine: `@capacitor-community/sqlite`.** This *overrides*
   `phase2-offline-first-plan.md` §5, which recommended reusing `@capacitor/preferences`
   (JSON blobs). The user explicitly chose SQLite instead. Plugin v8.1.0 supports
   Capacitor 8 (confirmed 2026-08-26). Native platforms use the plugin's native SQLite
   binding; web needs the `jeep-sqlite` web component + its sql.js WASM assets, which is
   a **different underlying engine than native** — the original repo Decision Log
   already flagged this pairing as needing explicit cross-platform testing, not assumed
   1:1 behavior. Budget real test time for both platforms in sub-phase 2.1, not just web.

2. **Counter notes have a complete state.** This *overrides* the "proposed default" in
   `phase2-offline-first-plan.md` §2 (which suggested counters have no complete state,
   since the mockups show no checkmark-circle on the counter note). Confirmed behavior:
   counters get the same manual checkmark-circle affordance as basic/list notes, **plus**
   an optional `target` on the payload — when set and `value` reaches `target`, the note
   auto-completes. Payload shape is therefore:
   ```ts
   { value: number, step: number, target?: number | null }
   ```
   (extends the `{ value, step }` shape from the phase2 doc). Exact edge-case behavior —
   what happens on manual un-check after auto-complete, or if `value` later drops back
   below `target` — is **not decided here**; sub-phase 2.5 (which implements this) should
   pick a simple, reversible rule (e.g. auto-complete only *sets* completed=true once;
   manual toggle always wins after that) and note it inline in the code, not re-open it
   as a planning question.

3. **`sortedBy` option set:** `'manual' | 'alphabetical' | 'date' | 'priority'`. This
   resolves the open item in `phase2-offline-first-plan.md` §10 (only "A to Z" was shown
   in mockups). `manual` uses the existing `position` field. `alphabetical` is the
   mockup-shown option. `date` sorts by `createdAt`, newest first. `priority` sorts
   high → low using the 4-value scale already locked in the phase2 doc (`low / normal /
   medium / high`).

4. **Fonts are self-hosted via npm, not a Google Fonts CDN `<link>`.** This app must work
   fully offline including first launch (that's the whole premise of Phase 2), so a
   runtime dependency on `fonts.googleapis.com` would break the offline-first guarantee
   on a fresh install with no network. Both requested fonts exist as self-hostable
   packages, confirmed 2026-08-26:
   - **Headers:** `@fontsource/geomini` — "Geomini", a compact geometric sans on Google
     Fonts, used for page/section headings ("workspace 1", "Board", "Power Tools", etc.)
     matching the bold display headings in the mockups.
   - **Notes/body/general UI:** `@fontsource-variable/google-sans-flex` — "Google Sans
     Flex", Google's variable UI font, used for note title/description text and general
     UI (buttons, labels, form fields) — i.e. the default body font, not narrowly scoped
     to just note cards.
   - Add as Tailwind `@theme` tokens in `src/index.css` (e.g. `--font-display: 'Geomini',
     sans-serif` and `--font-sans: 'Google Sans Flex Variable', sans-serif`), not inline
     `style={{fontFamily}}` strings, consistent with the existing token-based theme.

5. **`src/assets/background.jpeg` is a grid-paper texture, used as a cover-fill
   background.** It matches the graph-paper grid visible behind the board in
   `docs/design-references/web/Screenshot_2026-08-26_14-18-37.png`. Original plan was a
   repeating tile; revised in the 2.0 build session to `background-size: cover` (no
   repeat) instead — the source file (868KB, 7001×4001) has no cropping tooling
   available to cut a clean seamless tile from, and cover-fill still reads as the same
   texture without needing one. Applied via a `.bg-grid` utility class in
   `src/index.css` on board/home screen containers, both web and mobile — never globally
   on `body` (auth screens stay flat `bg-surface`).

6. **Scope of each future build session = exactly one numbered sub-phase below**, unless
   the user explicitly asks to combine phases. Sub-phases are ordered by dependency —
   don't start one before its "Depends on" list is done.

---

## Reuse patterns (apply across every sub-phase — don't rebuild these conventions per-phase)

Derived from a full read of the existing codebase on 2026-08-26. All still accurate as of
this doc's writing; re-verify quickly if much time has passed before building on them.

- **Web/mobile split** (per `CLAUDE.md`, already implemented for auth):
  hook in `src/common_logics/*.ts` (no JSX, owns state/validation/submit — e.g.
  `useLoginForm.ts`'s shape: `values`/`fieldErrors`/`isSubmitting` state,
  `handleChange(field, value)`, `validate()`, `handleSubmit()`) →
  `src/pages/<Name>Page.tsx` (private unexported web component, e.g. `WebLoginContent`,
  plus a default-exported `isNative ? <MobileScreen /> : <WebContent />` switch; this is
  the **only** layer `router/routes.tsx` imports from) →
  `src/mobile/screens/<Name>Screen.tsx` (native-specific layout; reuses the exact same
  `common_logics` hook and `components/ui/*` primitives as web — layout/touch-target/
  safe-area differences only, e.g. `mobile/screens/LoginScreen.tsx`'s
  `style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom:
  'max(2rem, env(safe-area-inset-bottom))' }}` and larger `py-3.5` touch targets vs.
  web's `py-2.5`) →
  `src/components/ui/*` (dumb, presentational, shared verbatim by both).
- **Global state = Context, not a new library.** No state-management package is
  installed (`useState`/`useReducer` + Context only). Follow `src/lib/auth/`'s exact
  4-file split for any new global state (e.g. workspace/active-group selection):
  `<domain>Context.ts` (types + `createContext`), `<Domain>Context.tsx` (provider,
  mirrors `AuthContext.tsx`'s mount-time hydrate + mutator methods that persist then set
  state), `use<Domain>.ts` (consumer hook, throws if used outside provider, mirrors
  `useAuth.ts`), and a guard component only if actually needed (mirrors
  `ProtectedRoute.tsx` — Phase 2 likely doesn't need a new guard since routing goes
  guest-first).
- **`components/ui/*` conventions** (from `Button.tsx`/`TextField.tsx`/etc.): every
  component extends the matching native HTML attributes interface
  (`ButtonHTMLAttributes<HTMLButtonElement>` etc.), accepts an optional `className` for
  override, spreads `...rest`. Styling: `rounded-card` everywhere (no other radius value
  used anywhere in the app), `bg-accent-purple` for primary actions, `text-nav-dark` for
  headings, `slate-*` for body/secondary text and neutral borders, `sticky-coral` (often
  at `/15` opacity for a background wash) for errors/destructive, `bg-surface` for page
  background, `bg-white` for cards, `focus:ring-2 focus:ring-accent-purple` on inputs.
  Only `AuthCard` uses a shadow (`shadow-lg`) — don't add shadows elsewhere without a
  reason. None of `Select`, `Modal`/`Sheet`, `Checkbox`/`CheckCircle`,
  `Tabs`/`SegmentedControl`, `SwatchPicker`, `ProgressBar` exist yet — sub-phase 2.0
  builds them once, following this same shape, so 2.4/2.5/2.6 don't each reinvent one.
- **No path aliases** — every import in this repo is relative (`../../lib/auth/useAuth`
  style). Keep doing that; don't introduce a `@/` alias.
- **No icon library — a curated PNG set lives in `src/assets/` instead.** As of the 2.0
  build session, `src/assets/` contains `home.png`, `pluse.png`, `power-tools.png`,
  `search.png`, `check-circle.png`, `check-tick.png`, `delete.png` — flat single-color
  icons matching the mockups' style, added directly by the user. These cover nav
  (home/+/power-tools), search, and the note-complete checkmark affordance
  (`check-circle` = empty ring, `check-tick` = checkmark, composited together for the
  checked state). No icon library dependency needed for these; a small inline SVG
  chevron covers `Select`'s dropdown indicator, and `Modal`'s close "×" reuses
  `pluse.png` rotated 45°. If a later sub-phase needs an icon not in this set (e.g. a
  gear/settings icon for 2.4's group settings row), add it as another PNG asset
  following this same style rather than reaching for a library at that point.
- **IDs:** `crypto.randomUUID()`, no library — confirmed zero existing UUID usage in the
  codebase to conflict with, and it's already the plan2 doc's chosen approach.
- **Session/local persistence precedent:** `src/lib/storage/preferences.ts` wraps
  `@capacitor/preferences` with a `taskodoro.<domain>.<field>` key namespace and
  JSON-stringifies values before `Preferences.set`. Reuse this exact convention for any
  *small* pointer values that stay in Preferences even after bulk data moves to SQLite
  (e.g. `activeWorkspaceId` in sub-phase 2.3) — don't invent a second key-naming scheme.
- **TS conventions:** `import type { X }` for type-only imports (`verbatimModuleSyntax:
  true`), strict `noUnusedLocals`/`noUnusedParameters`. No import-order lint rule, no
  custom ESLint rules beyond the recommended presets — nothing unusual to accommodate.

### Responsiveness note (applies to every UI sub-phase)

Per this session's explicit instruction: `pages/*` web content should be responsive
across web viewport sizes on its own merits — it does **not** need to pixel-match the
Capacitor mobile screens. Reuse the same `common_logics/` + `components/ui/*` building
blocks on both platforms, but the `pages/*` web JSX is free to lay them out differently
at wide vs. narrow browser widths where that reads better (e.g. a multi-column board on
wide desktop vs. the mockups' single-column mobile board) — same latitude the existing
three-way split already gives web vs. native.

---

## Sub-phases

### 2.0 — Design system foundation ✅ complete (`165f2c8`; visually reworked further, see "Beyond this roadmap")

**Goal:** establish fonts, grid background, and the shared UI primitives every later
phase depends on, so 2.1–2.6 aren't each rebuilding the same dropdown/modal/checkbox.

**Depends on:** nothing (first sub-phase).

**Key files:**
- `package.json` — added `@fontsource/geomini`, `@fontsource-variable/google-sans-flex`.
  No icon library — see the "Reuse patterns" note above on the curated PNG set in
  `src/assets/`.
- `src/main.tsx` — imports the font CSS from the two new packages.
- `src/index.css` — `--font-display`/`--font-sans` tokens in the existing `@theme` block
  (alongside `--color-*`/`--radius-card`); `--font-sans` applied as the default body
  font; `.bg-grid` utility built on `src/assets/background.jpeg` (cover-fill, see
  decision #5 above).
- New `src/components/ui/` primitives: `Icon.tsx` (thin `<img>` wrapper used by the
  rest), `Select.tsx`, `Modal.tsx` (single component, `variant: 'center' |
  'bottom-sheet'`), `CheckCircle.tsx` (the checkmark-circle complete-toggle affordance
  shared by basic/list/counter notes — composites `check-circle.png` +
  `check-tick.png`), `Tabs.tsx` (the Todo/In Progress/Completed segmented row),
  `SwatchPicker.tsx` (4-color note picker), `ProgressBar.tsx` (the group completion %).
  Each follows the existing `Button`/`TextField` shape (extend native attrs, accept
  `className`, `rounded-card`).
- `src/components/ui/BottomNav.tsx` (mobile: Home/+/Power Tools, 3 items) and
  `TopNav.tsx` (web: Home/Power Tools only, 2 items — the web mockup's top nav has no
  "+", don't force parity). Presentational only in this phase (render `react-router`
  `NavLink`s); wiring into a root layout is 2.2's job.

**Design reference:** all 5 mockups — this phase is about extracting the shared visual
language (typography, color, spacing, the checkmark-circle icon, tab styling, progress
bar) they all use, not one specific screen.

**Open items:** none blocking — icon library choice (`lucide-react`) is a
recommendation, confirm or swap when starting this phase if a different preference has
emerged.

---

### 2.1 — Local data layer (SQLite) ✅ complete (`165f2c8`; verified on real Android device 2026-08-26; gained its first real migration step since, see "Beyond this roadmap")

**Goal:** a working, tested (both platforms) local persistence layer for
Workspace/Group/Note, with no UI yet.

**Depends on:** nothing functionally, but should follow 2.0 if font/token work touches
`index.css` in ways that'd conflict — low risk either order.

**Key files:**
- `package.json` — add `@capacitor-community/sqlite`, `jeep-sqlite`.
- `public/` — sql.js WASM assets required by `jeep-sqlite` for the web platform.
- `src/lib/db/sqlite.ts` — connection bootstrap: native plugin path vs. `jeep-sqlite` web
  custom element path (branch on `usePlatform()`/`isNative()`, following the existing
  `lib/platform/` pattern), plus versioned schema migration running
  `CREATE TABLE workspaces/groups/notes` per the field tables in
  `phase2-offline-first-plan.md` §2, with the counter payload's `target` field added
  (decision #2 above).
- `src/types/workspace.ts`, `src/types/group.ts`, `src/types/note.ts` — TS interfaces
  matching the schema (net-new; no existing `Note`/`Group`/`Workspace` types anywhere in
  `src/types/` today).
- `src/lib/db/workspaces.ts`, `src/lib/db/groups.ts`, `src/lib/db/notes.ts` — CRUD
  functions: `crypto.randomUUID()` ids generated client-side, `createdAt`/`updatedAt`
  timestamps, soft-delete via `deletedAt` (never a hard `DELETE`), an unused-for-now
  `lastSyncedAt` scaffold per `phase2-offline-first-plan.md` §6 (don't wire it to
  anything yet — Phase 3 territory).
- First-run seed logic: if no workspace exists, auto-create "Workspace 1" plus
  Todo / In Progress / Completed groups, matching the mockups' default state so the
  board isn't empty on first launch.

**Design reference:** none — this phase has no UI.

**Open items:** cross-platform SQLite behavior (native plugin vs. `jeep-sqlite` +
sql.js on web) needs explicit manual testing on both a real/emulated Android device and
a browser before calling this phase done — don't assume parity.

---

### 2.2 — Guest-first routing rework ✅ complete (`80aa860`)

**Goal:** drop the forced auth gate; board becomes the default landing experience for
everyone, authenticated or not.

**Depends on:** 2.1 (board route needs somewhere to read data from, even if it renders
against seeded-but-empty data before 2.4/2.5 exist — reasonable to stub with a
placeholder board component here and let 2.4/2.5 fill it in, rather than blocking
routing work on note/group UI being finished).

**Key files:**
- `src/router/routes.tsx` — remove the `ProtectedRoute` wrapper around `/`; add routes
  for `/search`, `/power-tools`, `/power-tools/groups/:groupId`, `/notes/new`,
  `/notes/:id/edit`. `/login` and `/signup` stay as routes, just no longer the forced
  landing page.
- Add a Power Tools "Account" entry point (new section within the 2.4-built Power Tools
  screen, but the *link itself* — routing to `/login`/`/signup` — belongs conceptually
  here) so login/signup remain reachable.
- `src/lib/auth/ProtectedRoute.tsx` — likely stays unused in Phase 2 after this change
  (nothing left to gate); don't delete it, Phase 3 (real sync/account features) will
  need it again.

**Design reference:** mobile "power tools" screenshot, Account section (bottom of the
left panel) — confirms login/signup live there now, not at the app door.

**Open items:** none.

---

### 2.3 — Workspace context & switcher UI ✅ complete (`666e8ae`; switcher UI redesigned several times since, see "Beyond this roadmap")

**Goal:** multi-workspace create/rename/delete/switch, with one workspace always active.

**Depends on:** 2.1 (workspace CRUD functions), 2.2 (routing in place to build against).

**Key files:**
- `src/lib/workspace/workspaceContext.ts`, `WorkspaceContext.tsx`, `useWorkspace.ts` —
  follows the `lib/auth/` 4-file split described in "Reuse patterns" above. Loads
  workspaces via 2.1's `lib/db/workspaces.ts`, tracks `activeWorkspaceId` (persisted
  through `lib/storage/preferences.ts`, same key-namespace convention as
  `taskodoro.auth.*`), exposes `createWorkspace`/`renameWorkspace`/`deleteWorkspace`/
  `switchWorkspace`.
- Switcher UI — **no mockup exists for this** (`phase2-offline-first-plan.md` §7 flags
  it explicitly). Design inline: web = dropdown anchored to the "workspace 1" label in
  the header; mobile = tap-to-open sheet/modal (using 2.0's `Modal`/`Sheet` primitive).
  Both use `common_logics/useWorkspaceSwitcher.ts` for the shared list/create/rename/
  delete/switch logic, per the standard hook-first pattern.
- Deleting a workspace cascades a soft-delete to its groups and notes (consistent with
  the `deletedAt` approach — implement this cascade in `lib/db/workspaces.ts`'s delete
  function from 2.1, called here).

**Design reference:** none directly — use the header placement in every other mockup
("workspace 1" top-left, consistently) as the anchor point for wherever the switcher
trigger goes.

**Open items:** none blocking, but this is genuinely new UI with no visual spec —
expect more design iteration in-session than the mockup-backed phases.

---

### 2.4 — Group CRUD UI + settings + Power Tools screen ✅ complete (`dbaa462`; Power Tools/Group Settings visually redesigned and "On Check Move To" made functional since, see "Beyond this roadmap")

**Goal:** full group management: board tabs, group settings, and the Power Tools hub
screen that links to it.

**Depends on:** 2.1 (group CRUD), 2.3 (active workspace to scope groups to).

**Key files:**
- Board tabs row component (uses 2.0's `Tabs.tsx`) scoped to the active workspace's
  groups, with a "+" affordance to add a new group inline.
- `src/pages/GroupSettingsPage.tsx` + mobile variant — Sorted By (decision #3's 4
  options: manual/alphabetical/date/priority), On Check Move To (rendered but
  **disabled**, "none" only — real behavior deferred to Phase 3 per
  `phase2-offline-first-plan.md` §8), Note Colors (manual/random/priority — see
  `phase2-offline-first-plan.md` §3 for the exact resolution semantics each mode
  implies), Delete This Group (confirm dialog via 2.0's `Modal`, cascading soft-delete
  to the group's notes).
- `src/pages/PowerToolsPage.tsx` + mobile variant — Groups list (gear icon → group
  settings, × → delete, both per row) + "+ New Group", Addon Tools section (Pomodoro
  listed but disabled/placeholder — not built in Phase 2), Account section (Sync with
  Google disabled/placeholder — distinct feature from Google Sign-In auth, not
  specified yet; links to `/login`/`/signup`; Reset to Default with a confirm dialog).
- `src/common_logics/useGroupForm.ts`, `useGroupSettings.ts` — platform-agnostic
  create/rename/settings-update logic, following the `useLoginForm`-style shape.

**Design reference:** mobile "power tools" + "group settings" screenshots
(`docs/design-references/mobile/`).

**Open items:** "Reset to Default" needs a defined scope (reset just Power Tools
settings, or wipe all workspaces/groups/notes back to the first-run seed state?) —
resolve when building this phase, not before; low risk to defer since it's a rarely-hit
destructive action, not a data-model decision.

---

### 2.5 — Note CRUD UI (3 types) + board rendering ✅ complete (`4da912b`; editor and card visuals reworked, drag-and-drop added since, see "Beyond this roadmap")

**Goal:** the core CRUD surface — create/edit notes of all 3 types, render them on the
board.

**Depends on:** 2.1 (note CRUD), 2.4 (groups to place notes into, group's
`noteColorMode` to resolve note color against).

**Key files:**
- `src/pages/NoteEditorPage.tsx` + mobile variant — Title, Description, Note Type
  select (basic/counter/list), Color swatch (via 2.0's `SwatchPicker`, **disabled** and
  grayed out when the owning group's `noteColorMode !== 'manual'`, per
  `phase2-offline-first-plan.md` §3's manual/random/priority resolution logic — random
  freezes color at creation time, priority derives it live from the note's priority),
  Priority select (low/normal/medium/high, `normal` default).
- Type-specific payload editors, all within the same editor screen switching on Note
  Type: basic (no extra fields), counter (`step` input + optional `target` input per
  decision #2), list (add-item input, per-item checkbox + remove, no drag-reorder —
  `position` exists on list items for future reordering but isn't wired to any UI yet).
- Board card components: `src/components/ui/BasicNoteCard.tsx`,
  `CounterNoteCard.tsx` (+/− buttons mutating `payload.value` by `payload.step`,
  checkmark-circle per decision #2), `ListNoteCard.tsx` (checkbox items,
  strikethrough on completed, via 2.0's `CheckCircle`).
- Group progress-% bar (2.0's `ProgressBar`) — simple complete/total count for Phase 2;
  the "excluding notes with an active on-check-move-to rule" variant stays deferred to
  Phase 3 per `phase2-offline-first-plan.md` §8, since it directly depends on the
  on-check-move-to feature 2.4 ships disabled.
- `src/common_logics/useNoteForm.ts` — create/edit/validate logic per the established
  hook-first pattern.

**Design reference:** mobile "home" (board rendering), "notes with content" (populated
note-detail view), "new notes" (empty create form) screenshots, plus the web board
screenshot for the multi-column desktop layout.

**Open items:** counter auto-complete edge cases (see decision #2) — pick a simple rule
when building this phase and move on; don't block on it.

---

### 2.6 — Search & filter screen ✅ complete (`1d7e17b`; gained a desktop bento/masonry layout since, see "Beyond this roadmap")

**Goal:** read-only cross-group search/filter view, the last piece since it's purely a
view over data all prior phases already produce.

**Depends on:** 2.5 (note card components to reuse, note data to search over).

**Key files:**
- `src/pages/SearchPage.tsx` + mobile variant — search text input, status tabs (All/
  Todo/In Progress/Completed — reuses 2.0's `Tabs.tsx`), filter panel (Status toggle
  group, Priority chips, Color chips — reuses 2.0's `SwatchPicker` for the color chips).
  Renders results using 2.5's `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` directly,
  scoped across all groups in the active workspace — no new note-rendering logic needed.
- `src/common_logics/useSearchFilter.ts` — search text + filter state, filtering logic
  over the notes returned by `lib/db/notes.ts` (2.1).

**Design reference:** mobile "search" and "search with filter" screenshots.

**Open items:** none — this phase is fully specified by existing mockups and prior
phases' components.

---

## Explicitly out of scope for all of Phase 2

Reproduced from `phase2-offline-first-plan.md` §8, **as originally decided** — kept for
history, but see the status column: one of these was in fact built since. Do not build
any row still marked "still deferred" without an explicit new decision.

| Item | Originally deferred to | Status (2026-09-19) |
|---|---|---|
| "On Check Move To" actually moving notes | Phase 3 | **Built, 2026-09-13** — see "Beyond this roadmap" below |
| "Total % excluding next-group-check notes" | Phase 3 | Still deferred — group progress bar is still a plain complete/total count |
| Turnication (text-truncation toggle) | Later / Power Tools pass | Still deferred |
| "Sync with Google" (Calendar/Tasks/Keep) | Later | Still deferred — listed as disabled/placeholder in Power Tools' Account section |
| Monetization / tier gating | Unchanged, exploratory | Still deferred |
| Pomodoro addon | Not core | Still deferred — listed as disabled/placeholder in Power Tools' Addon Tools section |

---

## Beyond this roadmap: everything built after 2.6 that this doc never scoped

This roadmap's 7 sub-phases (2.0–2.6) were finished 2026-08-26. Every commit since then
(`db61a81` onward — 28 commits as of 2026-09-22) is real product work this doc doesn't
mention. `docs/changelog.md` is the authoritative, chronological record with full
rationale for each; this section is a topic-indexed map into it so you don't have to
scroll the whole changelog to find something. Dates below are changelog entry dates,
not commit dates, and group same-day follow-up fixes under their parent item.

### New functionality this roadmap didn't plan

- **"On Check Move To" is now fully functional** (2026-09-13) — this roadmap's own
  out-of-scope table above deferred this to Phase 3; it shipped instead. A group can
  target any other group in the same workspace; checking a note (fully, per-type) moves
  it to the destination, appended at the end. Ships with an optional per-group "Reset To
  Unchecked On Move" toggle (default on) so a moved note can either arrive fresh/
  unchecked (Kanban-style) or keep its checked state. The first-run seed groups
  (Todo/In Progress/Completed) now chain through this by default. See
  `docs/feat-notes.md` ("On Check Move To") and `docs/feat-groups.md`.
- **Kanban drag-and-drop for the board** (2026-09-03, mobile redesigned 2026-09-13) —
  `@dnd-kit/core`+`sortable`. Notes reorderable within a `manual`-sorted group,
  draggable to any other group regardless of sort mode; groups/tabs reorderable too.
  Mobile's cross-group move went through a full redesign (dwell-to-switch-tab →
  drop-target tiles) after the first approach proved unreliable on a real device. See
  `docs/feat-groups.md` ("Drag-and-drop").
- **Android hardware back button / edge-swipe navigation** (2026-09-12) — new
  `@capacitor/app` dependency; without this, every back press/gesture exited the app
  outright instead of walking router history. Includes a "press back again to exit"
  toast when there's no history left to walk. See `docs/feat-navigation.md`.
- **Directly-editable checklist subtasks, multiline** (2026-09-13) — list-note items
  were previously add/toggle/remove only; now click-in-and-type like the title/
  description, with Shift+Enter for a line break. See `docs/feat-notes.md`.
- **Inline group rename from Group Settings** (2026-09-13) — previously explicitly out
  of scope; the group name heading is now a directly-editable, autosave-on-blur input.
  See `docs/feat-groups.md`.
- **Mobile board remembers the last active group tab** across navigating away and back
  (2026-09-13) — was resetting to the first group on every `HomePage` remount (e.g. via
  the new Android back button). See `docs/feat-groups.md`.
- **First-run onboarding reworked to seeded walkthrough notes** (2026-09-13) — an
  intro-image modal was built, then replaced same-session by three seeded notes in the
  default Todo group that double as a live demo of the check-to-move/drag-and-drop
  chain. See `docs/feat-groups.md`.
- **Per-note statuses** (2026-09-22) — notes can now carry multiple free-text status
  entries (`NoteStatus { id, text, createdAt }`), added/edited-in-place/deleted from the
  note editor and shown newest-first with a created date/time; the board (and search
  results) show only the latest one per note as a full-width `NoteStatusStrip` footer
  that auto-scrolls (marquees) when it doesn't fit on one line. A new `notes.statuses`
  DB column, not part of `payload` since it applies across all 3 note types. Not
  scoped by this roadmap or by `phase2-offline-first-plan.md`'s original Note field
  table. See `docs/feat-notes.md` ("Statuses").

### Visual/UX reworks beyond the original mockup-matching pass

- **Board & note-card visual rework** (2026-08-28) — new `--color-ink`/`--shadow-card`/
  `--radius-card: 0px` tokens, `GroupColumn` extracted as its own component, note cards
  moved to a hard-edged neo-brutalist look matching a Penpot export pixel-for-pixel. See
  `docs/style-guide.md`.
- **Power Tools + Group Settings redesigned**: chip-row aesthetic replacing the original
  generic white-card look, plus a genuine desktop-only structural change — a persistent
  left sidebar (`PowerToolsSidebar`) with a right panel that drills into a selected
  group's settings (2026-09-13). See `docs/style-guide.md` ("Power Tools: row chips +
  desktop 2-panel drill-down") and `docs/feat-power-tools.md`.
- **Workspace switcher redesigned** several times in one session (2026-09-13): moved to
  the same chip-row system as Power Tools/Groups, inline autosave-on-blur rename with a
  pencil-icon trigger (a plain rename-as-input first broke click-to-switch, then got
  fixed), "×" delete replacing a text link, frosted-white dim overlay + deep offset
  shadow on open (plus two stacking/z-index follow-up fixes). See
  `docs/feat-workspaces.md`.
- **Every destructive `ConfirmDialog`** (note/group/workspace delete, Reset to Default)
  picked up the frosted-dim + deep-shadow look automatically once `Modal` gained
  `overlayClassName`/`panelClassName` (2026-09-13).
- **Search page gained a desktop layout** — bento/masonry results grid via CSS
  `columns`, widened filter cluster (2026-09-13). See `docs/feat-search-filter.md`
  ("Desktop layout").
- **Note editor**: swatch-colored checklist/counter config blocks (matching the
  read-only card instead of plain white fields), auto-growing title/description with no
  line cap, `lg:` two-column desktop layout (2026-09-12, several follow-up passes). See
  `docs/feat-notes.md`.
- **Status strip/editor block polish** (2026-09-22, same-day follow-up to the statuses
  feature above) — board strip text recolored to the note's own swatch color (was a
  fixed gray) and made bold; the editor's Status block reskinned to a dark `bg-ink`
  background (matching the board strip) with swatch-colored, bold text/icons instead of
  the note's own swatch-colored background the adjacent config blocks use;
  `ListNoteCard`'s strip width-matched to its indented checklist body instead of
  spanning the full card; marquee speed halved. See `docs/feat-notes.md`.

### Data model / defaults changes since the original decisions

- **Note Colors' `random` mode folded into `manual`** (2026-09-13) — `manual` now
  auto-assigns a random swatch at creation *and* stays user-editable afterward (previously
  two mutually-exclusive modes: auto-colored-and-locked vs. blank-and-editable). A schema
  migration rewrites existing `random` rows to `manual`. New groups now default to
  `sortedBy: 'manual'` / `noteColorMode: 'manual'` (was `alphabetical`/`random`). See
  `docs/feat-groups.md`, `docs/feat-notes.md` ("Color resolution").
- **First real schema-migration step** — `migrateSchema()`/`ensureColumn()` (idempotent
  `ALTER TABLE`, guarded by `PRAGMA table_info`), added for the new `groups.reset_on_move`
  column, since the schema previously had no version-tracking mechanism at all. Precedent
  for any future column addition to an existing table. See `docs/feat-offline-data-layer.md`.

### Bug fixes worth knowing about (surprising root causes, not just "fixed a typo")

- Workspace delete button did nothing on web — the switcher's outside-click listener
  raced the portalled `ConfirmDialog`'s own Confirm button (`pointerdown` fires before
  `click`), closing the dialog before `onConfirm` ran (2026-09-13).
- Note editor showed the raw manual color, not the priority-resolved color, in
  `priority`-mode groups — `resolveNoteColor`'s param type was too narrow to call from
  the editor's separate form-field state (2026-09-13).
- Checklist item checkbox didn't top-align on wrapped multi-line subtasks, inconsistent
  with basic/counter cards (2026-09-13).
- Multiline status text didn't fully display in the note editor (2026-09-22) — the
  status textarea's `flex-1` governed *height* inside its column-direction flex
  wrapper (added to hold the timestamp caption underneath it), which fought the
  manual autoGrow-via-inline-height technique used for auto-growing textareas
  throughout this page; swapped to `w-full`. See `docs/feat-notes.md`.
- Long marquee status text broke layout with page-level horizontal scroll, worst on
  mobile (2026-09-22) — `NoteStatusStrip`'s hidden overflow-measurement span was
  `position: absolute` with no `relative` ancestor, escaping its own
  `overflow-hidden` container to the document's initial containing block; fixed by
  adding `relative` to the container. See `docs/feat-notes.md`.
