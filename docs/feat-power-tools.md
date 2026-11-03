# Feature: Settings (formerly Power Tools)

`/settings` (`PowerToolsPage.tsx`) and `/settings/groups/:id`
(`GroupSettingsPage.tsx`) — the hub for everything that isn't core board/note CRUD:
group management and account. **Renamed from "Power Tools" in Phase 2.7**
(`phase2-apps-diary-plan.md`): the user-facing label and routes changed; internal
file/component names (`PowerToolsPage`, `PowerToolsSidebar`, `PowerToolsTab`) did not.
The old `/power-tools` and `/power-tools/groups/:id` paths redirect (`replace`) to the
new ones in `router/routes.tsx`. The **Addons tab/section was removed** in the same pass
— Pomodoro now lives under Apps (`feat-apps.md`); an old `?tab=addons` link falls back
to the Groups tab. Deliberately kept separate from the
guest-first board so first-time UX stays simple; this is where complexity lives once
someone goes looking for it.

## Layout: mobile vs desktop

Reworked against a mobile mockup (`docs/design-references/mobile/`) and a rough
desktop wireframe — see `docs/style-guide.md`'s "Power Tools: row chips + desktop
2-panel drill-down" section for the full visual system (chip rows, `DANGER_CHIP`,
`GroupIcon`). Structurally the two platforms now genuinely diverge:

- **Mobile** — `/settings` is one scrolling page (Groups → Board → Account → About, in
  that order) and `/settings/groups/:id` is a separate full-page screen, matching the
  two distinct mobile mockups. A `StickySettingsTabs` quick-nav strip (2026-10-31,
  `PowerToolsPage.tsx`) is `position: fixed` (not `sticky` — unlike `HomePage`'s strip,
  which already sits in flow right at the top of the board, Settings' Groups section
  starts right under a short intro, too close to the top for plain `sticky` to ever
  look hidden) and **not rendered at all** until the Groups section's own measured top
  has scrolled past the viewport's top edge, at which point it mounts pinned to the top
  with the same "tape material" backdrop as `HomePage`'s `StickyGroupTabs`
  (`docs/style-guide.md`'s "Scrolled header" section). `fixed inset-x-0` also avoids a
  side-gap `-mx-6`'s cancel-the-parent's-padding trick would otherwise leave once
  nested inside this page's `max-w-sm` mobile wrapper. Unlike the board strip, tapping
  a tab here doesn't switch which section is rendered — all four stay stacked and
  visible as always — it `scrollIntoView`s the tapped section instead (each wrapped in
  `scroll-mt-20` so it doesn't land hidden under the strip), and the active tab is
  driven by a small scroll-position scrollspy (last section whose top has crossed a
  line just below the strip, pinned to the last section once scrolled to the bottom of
  the page since a short last section can't always cross that line on its
  own).
- **Desktop** — a persistent left sidebar (`components/PowerToolsSidebar.tsx`, 3 tabs:
  Groups / Account & Sync / About, selected via `?tab=` on `/settings`, default
  `groups`) with a right panel whose content depends on the active tab. Opening a
  specific group's settings **is still a real navigation** to
  `/settings/groups/:id` (kept as a separate route on purpose — browser
  back/forward and deep-linking both still work), but visually it reads as the same
  right panel "drilling down" in place — no separate "Back" control, since the
  persistent sidebar's own "Groups" tab (`activeTab="groups"`, rendered by
  `GroupSettingsPage.tsx` too) already is the way back. This is a real `isNative`
  branch in both page files (not a CSS breakpoint) since it's
  an actual navigation-model difference, not just a layout reflow. Both the sidebar
  and the right panel sit on their own `border-neutral-300 bg-surface shadow-card`
  backdrop card (`PowerToolsDesktopLayout` in `components/PowerToolsSidebar.tsx`, a thin
  wrapper over the generic `components/SidebarPanelLayout.tsx` that Apps also uses) —
  the same board-backdrop treatment `GroupColumn`/`TopNav` use, desktop-only.

## Sections

- **Groups** — list of the active workspace's groups, each row: box icon (`GroupIcon`), name, gear
  icon (`SettingsIcon`, → `/settings/groups/:id`, see `feat-groups.md`), close icon
  (`CloseIcon`, → `ConfirmDialog` →
  cascading delete). A "+ New group" input + button chip below the list
  (`common_logics/useGroupForm.ts`) — **this is the only way to create a group** (see
  `feat-groups.md` for why the board itself has no create-group UI).
- **Board** (mobile only) — two settings for the floating "+", both read through
  `common_logics/useAddButtonSettings.ts`:
  - the "Dynamic Add Button" on/off switch chip, which controls its idle shrink, its
    wake on tilt left or down, and its tilt-right tuck;
  - an "Add Button Position" High / Medium / Low picker (`Tabs`, default Medium = 50%
    of screen height).

  See
  `feat-navigation.md` ("Dynamic Add Button"). Not shown on desktop web, which has no
  floating "+". On phone-sized web (the mobile layout in a browser) the section shows,
  but "Dynamic Add Button" is forced off and its switch is disabled with an "Android app
  only" hint: `useAddButtonSettings` returns `dynamic: false` and
  `dynamicAvailable: false` whenever `isNative` is false, without touching the stored
  value. The position picker works as usual.
- **Account** — built before the rest of this page existed (Phase 2.2, as the
  guest-first routing rework's login/signup entry point): shows email + Log out when
  authenticated, Log in/Sign up links otherwise (`useAuth()`, same auth system as
  `feat-auth.md`). Lives under the desktop sidebar's "Account & Sync" tab (mobile:
  still just the "Account" section, unchanged order).
- **Sync With Google** (Phase 3) — a real feature now, `SyncChip` in `PowerToolsPage.tsx`.
  Distinct from the Account row above it on purpose: sync is gated specifically on
  having signed in via Google (`useAuth().authMethod === 'google'`), not on being
  authenticated at all, so a user logged in with email/password still sees this chip
  read "Off". Tapping it while not connected that way runs Google Sign-In right there
  (`useGoogleSignIn(null)` — the `null` keeps the user on Settings instead of the
  Login/Signup pages' usual redirect to `/`); tapping it once connected triggers a
  manual sync. Status line covers not-synced/synced-`{time}`-ago/syncing/offline/
  needs-a-strategy-choice/signed-out. See `CLAUDE.md`'s "Sync" section and
  `docs/phase3-sync-plan-from-be.md` for the full design; `SyncStrategyDialog.tsx`
  (rendered from `App.tsx`, not this page) is the first-sync "keep local vs. use
  account" conflict prompt.
- **About** (own section/tab — mobile: last in the scrolling page; desktop: its own
  sidebar tab, `PowerToolsTab = 'about'`; 2026-10-31) — static app/parent-org identity
  plus the App Updates and Send Feedback chips, laid out as distinct blocks rather than more `CHIP`
  rows (a flat list of same-weight rows read as visually flat/boring in review — this
  gives the app's own identity a real hero moment and keeps the two brand logos large):
  1. **`HERO_CARD`** — a fixed 30:70 `grid-cols-[30%_70%]` split (not `flex` +
     intrinsic sizing, so the logo column's width stays exactly 30% regardless of text
     length): logo filling the left 30% column (`aspect-square w-full`), name/tagline/
     version stacked left-aligned in the right 70% column. The version pill reads
     `v{currentVersionName ?? APP_VERSION_FALLBACK}`. `APP_VERSION_FALLBACK` (`'0.1
     beta'` in `PowerToolsPage.tsx`) mirrors `android/app/build.gradle`'s `versionName`
     by hand (no runtime link between them) and is what web shows, since it has no
     native build to read; native shows the same on first paint, then swaps to the live
     `currentVersionName` once `useAppUpdate`'s auto-check resolves. **Keep this
     constant in sync whenever `build.gradle`'s `versionName` changes.**
     - The name/tagline/version column is a CSS container (`@container`, Tailwind v4
       built-in — no plugin) with its three text sizes set via `cqw`-based `clamp()`
       (e.g. `text-[clamp(1.5rem,15cqw,4.5rem)]`) rather than viewport `sm:`/`lg:`
       breakpoints. This column's actual rendered width doesn't track viewport width
       1:1 (the desktop sidebar + `max-w-6xl` cap mean a mid-width browser window can
       give the card a *narrower* column than a phone-width one gets in the mobile
       stack), so a viewport-breakpoint pass overflowed "Taskodoro" past the card
       border at some in-between desktop widths (e.g. ~700px) even though it fit fine
       at both 375px and 1024px. Sizing off the container's own width instead of the
       viewport fixes that by construction. The column also needs `min-w-0` — a flex
       item's default `min-width: auto` otherwise lets long text overflow instead of
       wrapping/shrinking, which was the other half of that bug.
  2. **`UpdateChip`** (native/Android only — hidden entirely on web, not
     shown-but-disabled like the Board section above) — shows the installed version and
     the result of the once-per-launch update check, with a manual "Check" trigger
     (`useAppUpdate()`, `lib/appUpdate/`). An update found anywhere in the app (not just
     here) also surfaces through `AppUpdateBanner.tsx`, rendered from `App.tsx` next to
     `SyncStrategyDialog`. See `docs/feat-app-update-check-from-be.md`. (Moved here from
     next to Sync With Google — same component and hook, just relocated.)
  3. A **"Send Feedback"** `CHIP` (`FeedbackIcon`, all platforms) that opens
     `FeedbackDialog` in `manual` mode (stars, optional comment, Send; no reminder
     controls). See `docs/feat-feedback-from-be.md` §6.
  4. A 2-column grid of square **`LINK_TILE`**s:
     - **Cross-platform link** — points at whichever platform you're *not* currently on,
       rather than linking back to the one already in use: on web, "Android Version" →
       `ANDROID_VERSION_URL` (`https://www.mavnt.in/`) with `AndroidIcon`; on native,
       "Web Version" → `WEB_VERSION_URL` (`https://taskodoro.mavnt.in/`) with
       `WebVersionIcon`. Both label/URL/icon branch together on `usePlatform().isNative`.
       Huge (the app's one icon family, `components/ui/icons.ts`) has neither an
       Android-branded glyph nor a laptop/monitor/computer one at all — so both
       `AndroidIcon` and `WebVersionIcon` are **deliberate exceptions to "Huge only"**:
       they re-export `SmartphoneIcon`/`LaptopIcon` from the Lucide family, also bundled
       in `@animateicons/react` (`@animateicons/react/lucide`). Both stay re-exported
       under app-level names in `icons.ts` per that file's own convention, so the glyph
       choice (and, for these two, the family) stays centralized if a better match is
       ever added to Huge.
     - Instagram → `https://www.instagram.com/mavn.t/` (`@mavn.t`).
  4. MAVNT (parent org) footer card — 80px logo (`assets/MAVNT_LOGO_TRANSPARENT.png`), a
     small "A product by" eyebrow, name, tagline ("Free & Opensource"); the whole card
     links to `https://www.mavnt.in/` (doubles as the "website" link).
  No `@capacitor/browser` plugin in this app — these are plain `<a target="_blank"
  rel="noreferrer">` elements (web opens a new tab; native Capacitor WebView hands
  off-origin navigations to the system browser by default).
- **Wipe All Notes** (Groups section, under Completed Group; 2026-10-05) — danger chip →
  `ConfirmDialog` → `wipeWorkspaceNotes` (`lib/db/notes.ts`). Soft-deletes every note in
  the **active workspace** in one write. The workspace, its groups and their settings
  stay, and so does the Diary's history, which records it as a single "Wiped" entry
  (`feat-diary.md`). Unlike Reset to Default it needs no reload: the board re-reads its
  notes when it is next opened.
- **Reset to Default** — danger chip → `ConfirmDialog` → `lib/db/reset.ts`'s
  `resetToDefault()` → `window.location.reload()`. Since 2026-10-05 it is a **full
  factory reset**: it erases everything stored on the device and seeds a new app.
  - Database: `DELETE FROM` `notes`, `groups`, `workspaces`, `activity_events` and
    `templates` (real deletes, not the soft-delete cascade), then `seedBuiltinTemplates`
    and `seedIfEmpty`. So the Diary's history and the user's own templates go too, and
    edited built-in templates return to their factory form.
  - Preferences: `Preferences.clear()`, which drops the auth session (the user is signed
    out on this device; nothing is sent to the backend), the active workspace and the
    add-button settings.
  - Browser storage: `localStorage.clear()` and `sessionStorage.clear()` (panel widths,
    the phone-web notice dismissal).
  The confirm dialog spells all of this out. To clear only one workspace's notes and keep
  everything else, use Wipe All Notes above.

## Why nothing here has a Save button

Every field in this app that isn't a create-flow's title (see `feat-notes.md`)
auto-saves the moment it changes — established with Group Settings' selects in Phase
2.4 and carried through everywhere since (Reset to Default/Delete This Group excepted,
which need an explicit destructive confirm, not silent auto-save). No mockup across the
whole app shows a Save button anywhere; this was read as intentional rather than an
omission.
