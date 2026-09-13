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
`usePlatform().isNative` — see `style-guide.md` for why this is never a
viewport check. The two navs are intentionally not 1:1: web's pill only has
Home/Power Tools (2 items), mobile's bar has Home/+/Power Tools (3 items) — matches
what the actual Penpot mockups show for each platform rather than forcing parity.

## First-run intro (`IntroModal.tsx` + `useIntro.ts`)

`IntroModal` is mounted once at the app root (`App.tsx`, a sibling of
`RouterProvider`, inside `WorkspaceProvider`) rather than inside any one page, so it
shows on top of whichever route the app opens to. `useIntro` (`common_logics/`) checks
`hasSeenIntro()` (`lib/storage/preferences.ts`, a `taskodoro.intro.seen` flag through
the same `@capacitor/preferences`-backed helper auth/workspace state already use — not
a raw `localStorage` call, so it persists correctly on native too) on mount and opens
the modal if it hasn't been seen; dismissing it (the header's × close button, click
outside, or Escape — all wired through `Modal`'s existing `onClose`) calls
`markIntroSeen()` so it never shows again on that device. Content is the "How To Use
This Template" mockup graphic — `src/assets/intro-mob.png` (taller portrait crop) below
the `md:` breakpoint, `src/assets/intro.png` (wider landscape crop) at `md:` and above,
swapped with plain `hidden`/`md:hidden` classes on two `<img>`s rather than
`usePlatform().isNative`, since this is which crop reads best at a given viewport
width, not a native-vs-web behavior fork — inside the shared `Modal`, styled with the
same frosted-white-dim + deep-offset-shadow treatment
as `ConfirmDialog`/`WorkspaceSwitcher` (`docs/style-guide.md`), widened past `Modal`'s
default `max-w-sm` via `panelClassName`'s `!max-w-lg md:!max-w-2xl lg:!max-w-3xl` (an
`!important` override, since appending a plain conflicting-specificity utility to
`panelClassName` isn't guaranteed to win against `Modal`'s own hardcoded panel-shape
classes — see `Modal.tsx`'s own comment on why `overlayClassName`/`panelClassName` are
full replacements, not additions) — progressively wider on desktop viewports so the
mockup graphic's text stays readable, while staying compact on mobile/native.

## Android hardware back button / edge-swipe

Handled by `src/lib/platform/useAndroidBackButton.ts`, mounted once in `AppShell.tsx`
so it's active on every route regardless of page. Without this, Capacitor's
`BridgeActivity` exits the app on any back press — hardware button or the right-edge
gesture-nav swipe, both of which fire the same `@capacitor/app` `backButton` event —
instead of walking the router's history, since nothing registers a JS-side listener by
default.

Behavior: the native event's `canGoBack` reflects real `window.history` depth, since
the router (`createBrowserRouter`) uses actual browser `pushState` history — most
navigation (`BottomNav`/`TopNav` links, note-card taps) pushes rather than replaces, so
history accumulates as the user moves around. When `canGoBack` is true, the hook calls
`window.history.back()`, which the router picks up as a normal `popstate`/`POP`
navigation — no `useNavigate`/router context needed, since the hook doesn't render
under `RouterProvider` anyway. When it's false — always Home, since the app boots at
`/` (see "Guest-first" above) — the first back press arms a ~2s window and shows
`ExitToast` ("Press back again to exit"); a second press within that window calls
`App.exitApp()`.

This is native-only (gated on `usePlatform().isNative`) and, per the platform-detection
rule referenced above (`style-guide.md`), can only be verified on a real device/
emulator — browser resizing can't exercise it.

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
