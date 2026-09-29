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
| `/settings` | `PowerToolsPage` | Settings (formerly Power Tools) — see `feat-power-tools.md`. |
| `/settings/groups/:groupId` | `GroupSettingsPage` | |
| `/power-tools`, `/power-tools/groups/:groupId` | → `/settings…` | Legacy redirects (`replace`) since the 2.7 rename. |
| `/apps` | `AppsPage` | Web: redirects to the first enabled app. Mobile: app tile list. See `feat-apps.md`. |
| `/apps/diary` | `DiaryPage` | Placeholder until Phase 2.8. |
| `/notes/new` | `NoteEditorPage` | Reads `?group=<id>` from the query string. |
| `/notes/:id/edit` | `NoteEditorPage` | Same component as create — see `feat-notes.md`. |
| `/login`, `/signup` | `LoginPage`, `SignupPage` | Reachable only from Settings' Account section now, not the app door. |
| `*` | → `/` | Catch-all redirect. |

## Chrome (`AppShell.tsx` + `TopNav`/`BottomNav`)

Every page wraps in `AppShell` (`src/components/AppShell.tsx`), which applies the
`.bg-grid` background and renders `TopNav` (web) or `BottomNav` (mobile) based on
`usePlatform().isNative` — see `style-guide.md` for why this is never a
viewport check. Since Phase 2.7 both navs have the same 3 destinations, in the order
each wireframe shows: web's pill is **Home / Settings / Apps** (labelled), mobile's bar
is **Home / Apps / Settings** (icon-only, `aria-label`s).

### Mobile quick-add (`FloatingAddButton`)

Mobile's "+" used to be the middle cell of `BottomNav`; since 2.7 it's
`components/ui/FloatingAddButton.tsx` — a purple half-pill pinned to the right screen
edge, rendered by `HomePage`'s `isNative` board branch only. It links to
`/notes/new?group=<activeGroupId>`, i.e. the active tab's group — the same target the
old nav "+" used and the same thing web's per-column "+" (`GroupColumn` header, unchanged,
hidden on mobile via `showHeader={false}`) does per column. So there's still exactly one
add affordance per platform. Hidden during a note drag (so it can't cover
`GroupDropTargets`) and when the workspace has no groups (the empty state points to
Settings instead). Other pages have no quick-add on mobile anymore.

#### Tilt to move

`FloatingAddButton`'s `tiltToMove` prop is driven by the stored preference
(`common_logics/useTiltAddButtonSetting.ts`, key `taskodoro.ui.tiltAddButton`). It is on
by default and toggled in Settings → Board, which only appears on mobile. The prop runs
`lib/motion/useTiltSlide.ts`, which works like this:

- **Sensor:** the web `deviceorientation` event's `beta` (front-back tilt). Capacitor's
  Android WebView provides it without a permission prompt, and no plugin is used. The
  reading is low-pass filtered (about 80 ms) to remove hand tremor.
- **Neutral:** the angle the phone is held at when the board mounts becomes the
  baseline. The baseline re-adjusts slowly (τ = 15 s) only while the phone is within 10°
  of it. That way a new resting grip stops counting as tilt, but a deliberate tilt held
  for a long time is not absorbed. The baseline is re-learned after the phone goes to
  landscape or the app is backgrounded.
- **Physics:**
  - Tilts under 4° are ignored.
  - Past that, acceleration is `3000px/s² × sin(tilt)`, with the tilt capped at 30°.
  - Rolling drag always applies. Strong extra friction applies when the phone is back
    inside the deadzone, so the button coasts to a stop and stays there; it does not
    spring back.
  - Top speed is 900 px/s.
  - The ends of travel give a small damped bounce. The top end is the button's CSS
    `top`; the bottom end is where the button's centre reaches the user-chosen
    fraction of the viewport height — **2/6, 3/6 (default), or 4/6**, shown as **Short / Medium / Long**
    in Settings → Board's "Slide distance" row (key `taskodoro.ui.tiltAddButtonTravel`, stored as the numerator;
    unknown values fall back to 3). Passed as `FloatingAddButton`'s `tiltMaxFraction`.
    Changing it while the button sits lower than the new limit clamps it up on the next
    board mount.
- **Direction:** positive `beta` delta (the bottom edge dips as the phone becomes more
  upright) moves the button down.
- **Runtime:**
  - Position is written straight to `style.transform`, so React does not re-render each
    frame.
  - The rAF loop sleeps whenever the button is at rest and the phone is level.
  - The offset is kept in a module variable, so it survives remounts (navigating away,
    or hiding during a drag).
  - It is disabled under `prefers-reduced-motion` and in landscape.

All tuning constants are at the top of `useTiltSlide.ts`. This can only be tested on a
real device; desktop browsers do not fire `deviceorientation` with real data.

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
