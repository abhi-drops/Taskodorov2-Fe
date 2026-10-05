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
| `/apps/templates` | `TemplatesPage` | Template list. See `feat-templates.md`. |
| `/apps/templates/:templateId` | `TemplateEditorPage` | Template editor. |
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
`components/ui/FloatingAddButton.tsx` — a purple bell-curve bump (exact Penpot path, see `style-guide.md`) pinned to the right screen
edge, rendered by `HomePage`'s `isNative` board branch only. It links to
`/notes/new?group=<activeGroupId>`, i.e. the active tab's group — the same target the
old nav "+" used and the same thing web's per-column "+" (`GroupColumn` header, unchanged,
hidden on mobile via `showHeader={false}`) does per column. So there's still exactly one
add affordance per platform. Hidden during a note drag (so it can't cover
`GroupDropTargets`) and when the workspace has no groups (the empty state points to
Settings instead). Other pages have no quick-add on mobile anymore.

Both of its settings live in Settings → Board (mobile only) and are read through
`common_logics/useAddButtonSettings.ts`. `HomePage` doesn't render the button until
they've loaded, so it never flashes at the wrong height.

#### Position

The "Add Button Position" setting (`Tabs`: **High / Medium / Low**, key
`taskodoro.ui.addButtonPosition`, unknown values fall back to `medium`) puts the
button's centre at 30%, 50% (default) or 70% of the viewport height. It is applied as
`top: calc(N% - 50px)` (the button is 100px tall), **not** with a `transform`. The idle
shrink animates the CSS `scale` property, and CSS applies `scale` on top of `transform`,
so a transform offset would be scaled too and the button would jump when it shrinks.
That bug was hit once with the old slide.

#### Dynamic Add Button

`FloatingAddButton`'s `dynamic` prop is driven by the stored preference (key
`taskodoro.ui.tiltAddButton`; the key name predates the rename and is kept so existing
choices carry over). It is on by default and toggled by the "Dynamic Add Button" switch.
The prop runs `lib/motion/useTiltShrink.ts`.

**The button never moves; only its size changes.** An earlier version slid the button
up and down the screen with the phone's front-back tilt, with physics, a Short / Medium
/ Long travel setting, and end-of-travel haptics. It was removed on 2026-10-02 as too
much motion. That code is in git history (`useTiltSlide.ts`, last at `e1d9832`).

- **Sensor:** the web `deviceorientation` event's `gamma` (left-right roll) and `beta`
  (front-back tilt). Capacitor's Android WebView provides it without a permission
  prompt, and no plugin is used. Chromium feeds it from Android's fused rotation sensor
  (gyroscope + accelerometer). Each reading is low-pass filtered (about 80 ms) to remove
  hand tremor.
- **Neutral:** the angles the phone is held at when the board mounts become per-axis
  baselines. Each re-adjusts slowly (τ = 15 s) only while the phone stays within 10° of
  it, so a new resting grip stops counting as a tilt but a deliberate tilt is never
  absorbed. They are re-learned after landscape or backgrounding.
- **Idle shrink:** after 8 s with nothing happening, the button springs down to 60%
  size, anchored at the screen edge (`transform-origin: 100% 50%`) so it tucks in
  rather than floating.
- **Wake (roll left, or tilt down):** either of these springs it back to full size and
  restarts the 8 s countdown:
  - rolling the left edge down more than 12° past the baseline (negative `gamma`
    delta);
  - tilting the bottom edge down more than 12°, so the phone is more upright (positive
    `beta` delta). This is the same "down" direction the old slide used.
- **Tuck (roll right):**
  - Rolling the right edge down more than 12° while full size shrinks it immediately.
  - Then **every** wake trigger is ignored for 1.7 s.
  - It is edge-triggered: the roll has to relax back under 6° before another tuck can
    fire, so a phone held rolled right doesn't re-tuck the instant it wakes.
  - It shares the shrink path, including the light haptic, with the idle shrink. An
    idle timer that is already pending does nothing if the button is already small.
- **Spring:** size uses the individual CSS `scale` property with a CSS transition. The
  easing is a real underdamped spring (ζ 0.45, 650 ms, about 20% overshoot) sampled into
  a CSS `linear()` curve, with an overshooting cubic-bézier fallback for WebViews
  without `linear()`.
- **Off switches:** it is disabled when the setting is off, under
  `prefers-reduced-motion`, in landscape, and on WebViews without the `scale` property
  (Chromium < 104, checked with `CSS.supports`). In all of these the button simply stays
  full size. With the setting off it never shrinks, because nothing could wake it.
- The idle timer is one self-re-arming `setTimeout`. The button is still tappable while
  small.
- **Haptics** (`@capacitor/haptics`, through `lib/platform/haptics.ts`, which is
  native-only, fire-and-forget, and swallows errors):
  - Tapping the button: medium impact, set with `data-haptic="medium"` and handled by
    the app-wide tap haptics below. It works even when the setting is off.
  - Shrinking (idle or tuck): light impact. Growing back: medium impact.
  - The plugin brings the `VIBRATE` permission through its own manifest merge; it needs
    `npx cap sync`, which `npm run android` already runs.

All tuning constants are at the top of `useTiltShrink.ts`. This can only be tested on a
real device; desktop browsers do not fire `deviceorientation` with real data.

## Page transitions

One visual vocabulary, chosen by **kind of navigation**, built to match the board's
neo-brutalist look (`style-guide.md`): square edges, a hard ink edge and hard offset
shadow on paper "sheets", no blur, no overshoot. Durations are 200–320 ms so it stays
calm for everyday use. Code: `lib/motion/pageTransitions.ts`; CSS: `index.css` under
`html[data-pt=…]`.

| Navigation | Mobile | Desktop |
|---|---|---|
| Open a note from its card | `note-open`: the card **morphs** into the editor's note card | same |
| Leave that note (back, nav tab, …) | `note-close`: morphs back into its card | same |
| Into the editor otherwise ("+" buttons) | `sheet-in`: a paper sheet slides in from the right with a 3px ink edge; the board recedes 20% and dims | `fade` |
| Out of the editor otherwise (incl. after delete) | `sheet-out`: the sheet slides back off to the right | `fade` |
| Between bottom-nav tabs | `slide-next` / `slide-prev`: a 24px slide plus fade in tab order (Home → Apps → Settings) | `fade` (8px rise plus fade) |
| Search (board's or Diary's search icon), and back | `fade` | `fade` |
| Same page (re-tapping the current tab) | `none` (instant) | same |
| Anything else that animates | `fade` | `fade` |

This replaced a feathered circle-reveal (2026-10-02), which was soft and round against
an otherwise hard-edged UI and was removed as not fitting the aesthetic.

### How it works

- **Opt-in per navigation** with React Router's own `viewTransition`: `<Link
  viewTransition>`/`<NavLink viewTransition>` (`BottomNav`, `TopNav`, the floating "+",
  `GroupColumn`'s "+", the search icons on `HomePage` and `DiaryPage`) or `navigate(to, { viewTransition: true })` (note cards via
  `useOpenNote`, the editor's delete).
- **Back animates in reverse for free.** React Router replays a view transition on
  POP (back/forward) to any page that has had an animated forward navigation
  (`appliedViewTransitions`, persisted in sessionStorage). So Android back
  (`useAndroidBackButton` → `history.back()`) and browser back get the reverse
  animation, with no history interception. The kind is recomputed from the actual
  from→to paths, so e.g. back from Settings to Home is `slide-prev`.
- **Choosing the kind:** `installPageTransitions(router)` (called once in
  `routes.tsx`) subscribes to the router. On each real location change (a new
  `location.key`) it runs `pageTransitionKind(previousPath, nextPath)` and sets
  `<html data-pt="kind">`. React Router starts the view transition in a later
  effect, so the attribute is always in place before the browser snapshots.
- **Ready gate:** the board (`useBoard`) and the editor (`useNoteForm`) load from SQLite
  *after* mounting, so the browser's "after" snapshot would capture an empty board or
  "Loading…", and the morph would have no target.
  - `installPageTransitions` wraps `document.startViewTransition` so the update
    callback also awaits the destination page's readiness, capped at 500 ms (a cold
    first SQLite read can take a few hundred ms).
  - Pages opt in with `useTransitionReady(isLoaded)`: `HomePage` passes `board.loaded`,
    `NoteEditorPage` passes `status !== 'loading'`.
  - A page with async content that should be captured loaded must call it too.
- **Note morph:** the tapped card and the editor's note card share
  `view-transition-name: note-morph`.
  - `useOpenNote` names the clicked card *before* navigating, since the "before"
    snapshot is taken next.
  - `noteMorphName(id)` names the editor card, and the board's card again on the way
    back, at render.
  - Only that one note is ever named. `useOpenNote` and any unrelated navigation call
    `clearNoteMorph()`, so the name can't leak into a tab slide.
  - Delete calls `clearNoteMorph()` explicitly, because the card it would morph back
    into is gone.
  - **Gotcha (caused the "doesn't morph the first time" bug):** two elements with the
    same `view-transition-name` make the browser **abort the whole transition**.
    - After closing note A, the board re-renders A's card with the name through React
      (`noteMorphName`), not through `useOpenNote`'s hand-set marker.
    - The first version of `clearNoteMorph()` only stripped hand-set names, so tapping
      card B then left two `note-morph` elements and no animation.
    - It now strips the name from every element carrying it
      (`[data-vt-morph], [style*="note-morph"]`).
  - **The whole card is the morph source, deliberately.** Morphing only each card's main
    colour block (title area or title strip, leaving the status strip and list body to
    fade) was tried on 2026-10-03. It looked noticeably worse and was reverted.
  - **The morph is a plain coloured block, not stretched screenshots.**
    - The `::view-transition-group(note-morph)` box is painted the note's sticky colour
      (`--pt-morph-color`, set by `useOpenNote` from the card's resolved colour and kept
      current by the editor via `setNoteMorphColor`), with `--shadow-card`. It animates
      from the card's box to the editor card's box.
    - Both snapshots are shown unscaled (`object-fit: none`) and clipped to the block.
    - The card's content fades out over the first 30%, and the editor's content fades
      in over the last 45%.
    - Earlier, stretching a counter, list or status card's snapshot into the editor's
      title/description card looked glitchy, because the contents don't match. A plain
      block morphs identically for every note type.
- **Persistent chrome stays put:** `BottomNav` (`bottom-nav`) and `TopNav` (`top-nav`)
  have their own `view-transition-name`, so pages slide or fade *under* them instead of
  dragging the nav along.
- **Gotcha:** the browser blends the old and new page snapshots with
  `mix-blend-mode: plus-lighter`, which adds colours wherever two opaque pages overlap,
  so a sliding sheet would wash out to white. The root snapshots are forced to
  `mix-blend-mode: normal`; keep that if adding new kinds.
- **Fallback:** without View Transitions support (Chromium < 111) React Router
  navigates normally. Under `prefers-reduced-motion` all transition animations are
  disabled in CSS.
- **Not covered:** navigations without `viewTransition` (Settings sidebar links, Apps
  tiles, auth redirects) don't animate on the way forward. They can get a `fade` on
  the way back, through React Router's POP replay.

## Tap haptics (mobile, app-wide)

`src/lib/platform/useTapHaptics.ts` is mounted once in `App.tsx`. It is native-only and
does nothing on web. It is a single capture-phase `click` listener on `document`, not a
handler on every button, so **every button, link, tab, switch and checkbox gets haptic
feedback automatically, including ones added later.** No per-component work is needed.

- It matches `button`, `a[href]`, `[role=button|tab|switch|checkbox]`, and native
  checkbox or radio inputs. The closest match to the tapped element decides.
- Most elements get a light impact.
- Checkboxes (`CheckCircle` is a `role="checkbox"` button):
  - Checking gets a medium impact, unchecking a light one.
  - The old state is read from `aria-checked` before React handles the click. For
    native inputs it is read as `!checked`, because those toggle before listeners run.
- Per-element override: `data-haptic="light" | "medium" | "heavy" | "none"`. For
  example, the floating "+" uses `medium`. Use `none` to silence a control that already
  gives its own feedback.
- It listens for `click`, not `pointerdown`, so a touch that turns into a scroll never
  buzzes. Disabled buttons don't fire `click`, and `aria-disabled="true"` elements are
  skipped.
- **Don't** also call `haptics.*` in a button's own `onClick`. It would fire twice; set
  `data-haptic` instead. `haptics.*` calls are for non-tap events, like the floating
  "+"'s spring and end-of-travel thuds.

## Android hardware back button / edge-swipe

**An open modal closes first.** `Modal` registers its close function in
`lib/platform/backHandlers.ts` while it is open, and `useAndroidBackButton` runs the newest
one before doing anything else, so a back press on a full-page modal closes it instead of
navigating the page underneath.

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
