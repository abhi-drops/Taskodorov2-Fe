# Feature: Navigation & Guest-First Routing

## Guest-first

The app opens straight to the board (`/`) for everyone, authenticated or not — no
login/signup gate. This is the core premise of Phase 2: a personal task manager usable
immediately, with account/sync as an opt-in Power Tools value-add, not a toll gate.

`src/lib/auth/ProtectedRoute.tsx` still exists but is **unused** — nothing in Phase 2
routes through it. Not deleted; Phase 3's real account/sync features will need it
again.

## Route table (`src/router/routes.tsx`)

| Path | Page | Notes |
|---|---|---|
| `/` | `HomePage` | The board. |
| `/search` | `SearchPage` | |
| `/power-tools` | `PowerToolsPage` | |
| `/power-tools/groups/:groupId` | `GroupSettingsPage` | |
| `/notes/new` | `NoteEditorPage` | Reads `?group=<id>` from the query string. |
| `/notes/:id/edit` | `NoteEditorPage` | Same component as create — see `feat-notes.md`. |
| `/login`, `/signup` | `LoginPage`, `SignupPage` | Reachable only from Power Tools' Account section now, not the app door. |
| `*` | → `/` | Catch-all redirect. |

## Chrome (`AppShell.tsx` + `TopNav`/`BottomNav`)

Every page wraps in `AppShell` (`src/components/AppShell.tsx`), which applies the
`.bg-grid` background and renders `TopNav` (web) or `BottomNav` (mobile) based on
`usePlatform().isNative` — see `feat-design-system.md` for why this is never a
viewport check. The two navs are intentionally not 1:1: web's pill only has
Home/Power Tools (2 items), mobile's bar has Home/+/Power Tools (3 items) — matches
what the actual Penpot mockups show for each platform rather than forcing parity.

## Responsiveness

Per an explicit product decision (not a mockup requirement): web content should be
responsive on its own merits across browser widths — it does not need to pixel-match
the Capacitor mobile screens. The board is the clearest example: mobile renders groups
as `Tabs`-switched single-column content, web renders them as parallel columns — same
underlying data and components (`common_logics/useBoard.ts`, the note cards), just a
different `isNative` branch inside `HomePage.tsx` rather than a full separate
`mobile/screens/` file (that split is reserved for cases with real interaction
differences, like auth's touch-target/safe-area handling — a page-layout difference
alone doesn't warrant it).
