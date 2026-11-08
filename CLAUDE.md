# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskodoro frontend: a React 19 + Vite + TypeScript app wrapped with Capacitor to run on both web and Android from one codebase. Guest-first and offline-first — the app is fully usable with zero account, all data stored locally on-device via SQLite. It optionally talks to a separate backend (`Taskodoro-Be`, not in this repo) running locally at `http://localhost:8787` during development, only for the opt-in account/sign-in features reached from Settings (formerly "Power Tools" — internal file/component names like `PowerToolsPage` kept the old name).

## Commands

```bash
npm run dev              # Vite dev server (web)
npm run build             # tsc -b && vite build — type-check then bundle, PRODUCTION backend
npm run build:local       # tsc -b && vite build --mode development — same bundle, LOCAL backend
npm run lint               # eslint .
npm run preview            # serve the last build's dist/ locally, whichever backend it was built against
npm run android            # build:local + cap sync + adb reverse tcp:8787 + install & launch — points at YOUR LOCAL backend
npm run android:prod       # build + cap sync + install & launch (no adb reverse) — points at the DEPLOYED backend
```

There is no test runner configured in this repo.

Android builds require `java` (JDK 21+ — the Capacitor Android core library needs Java source release 21, not 17) and `adb`/Android SDK tools on `PATH`, plus `ANDROID_HOME`/`ANDROID_SDK_ROOT` set. Both `npm run android` and `npm run android:prod` assume these are already available in the shell.

## Environment

Copy `.env.example` to `.env.local` (gitignored) and fill in:
- `VITE_API_BASE_URL` — backend base URL (defaults to `http://localhost:8787` in code if unset). Read by `npm run dev` and `npm run build:local`/`npm run android` (both force Vite's `development` mode specifically so `.env.production` is skipped) — see **Production backend** below for the other build path.
- `VITE_GOOGLE_CLIENT_ID_WEB` — Google OAuth **Web** client ID. Leave blank to keep Google Sign-In visibly present but disabled (no crash) on both platforms — see `isGoogleWebConfigured`/`isGoogleNativeConfigured`.
- `VITE_GOOGLE_CLIENT_ID_ANDROID` — documentation only, not read by any code path. The Android OAuth client only needs to exist in Google Cloud Console (matched by package name `com.taskodoro.app` + debug signing SHA-1, get via `cd android && ./gradlew signingReport`); its ID value is never used at runtime. See `GOOGLE_SIGNIN_TESTING.md` for full Google Cloud Console setup and the debug-SHA-1 registration flow.

### Production backend

**Two separate build paths, picked by which Vite mode runs** — not by anything the app
reads at runtime (nothing in `src/` touches `import.meta.env.DEV`/`PROD`/`MODE`; only
which `.env.*` file loads differs, and both paths produce the same fully-minified
bundle, just against different env values):
- `npm run build` / `npm run android:prod` → Vite's default `production` mode →
  loads `.env.production` (committed, not gitignored like `.env.local` — neither value
  in it is a secret: the API URL is visible in every request it makes, and a Web OAuth
  Client ID is meant to be public). Currently points at the deployed Cloudflare Workers
  backend, `https://taskodoro-be.abhinand4work.workers.dev`, with its own
  `VITE_GOOGLE_CLIENT_ID_WEB` set too — a clean checkout (CI, a teammate) needs both to
  produce a working production build without first copying someone's `.env.local`.
- `npm run build:local` / `npm run android` → explicit `vite build --mode development`
  → `.env.production` is skipped entirely (mode-specific), so `VITE_API_BASE_URL`
  resolves from `.env.local` as usual (`http://localhost:8787` by default) — this is
  what makes `adb reverse tcp:8787 tcp:8787` meaningful for `npm run android` again;
  it would be a no-op against the deployed backend.

To point a production-mode build at some other backend temporarily, use
`.env.production.local` (gitignored, `*.local` — same precedence rule as `.env.local`,
just scoped to the `production` mode) rather than editing the committed file.

## Documentation

- **`docs/feat-*.md`** — one file per major feature (auth, offline-data-layer, navigation, workspaces, groups, power-tools (= Settings), apps, diary, templates, notes, search-filter, design-system, onboarding, theming). This is where feature *behavior and rationale* lives in depth; this file (`CLAUDE.md`) stays a high-level map plus the gotchas sharp enough to bite someone.
- **`docs/changelog.md`** — running log of what changed and when, newest entry first.
  **After any meaningful change to this codebase (a new feature, a real bug fix, a
  behavior change — not a typo fix or a pure refactor with no behavior change), add an
  entry to the top of `docs/changelog.md`** summarizing what changed and why, and link
  to (or update) the relevant `docs/feat-*.md` file. If the change adds or
  substantially changes a feature, update or create the matching `feat-*.md` too — the
  changelog is a log entry, not a substitute for the feature doc staying accurate.
- **The templates "AI Guide" (`src/lib/templates/aiGuide.md`) must be updated with the
  code.** It is a Markdown file users download from the Templates app and paste into an
  AI assistant (ChatGPT, Claude, ...) so it can write or edit a template file; it is the
  only description of the template file format an outside tool ever sees. **Whenever a
  change touches templates or anything a template describes, update the guide in the
  same change**, and say in the changelog entry that it was updated. That covers:
  - the file format, its parsing and limits (`lib/templates/templateFile.ts`,
    `types/template.ts`);
  - what a template can hold: a new group setting, note type, note field, colour or
    priority (`types/group.ts`, `types/note.ts`, `swatchColors.ts`,
    `resolveNoteColor.ts`), including a change to what an existing value means;
  - how templates are imported, replaced or exported in the UI (the guide's "Using the
    file" steps name the buttons).

  The guide's last JSON block is a complete example: after editing the guide, check that
  example still imports unchanged through `parseTemplateFile`. If a change turns out not
  to affect the guide, say so in your summary rather than skipping the check silently.
- **`docs/phase2-roadmap.md`**, **`docs/phase2-offline-first-plan.md`** — the planning
  docs Phase 2 was built from; mostly historical now that Phase 2 is complete, but
  still the record of *why* certain decisions were made (kept for that reason, not
  meant to be re-read as current-state documentation — `feat-*.md` is current-state).

## Architecture

### Web/mobile split with shared logic

Every screen follows the same three-way split:
- **`common_logics/`** — platform-agnostic hooks (no JSX): all form/state/validation/submit logic. Both web and mobile UI consume the exact same hook.
- **`pages/`** — the web UI implementation lives directly here (as a private, unexported component in the same file) plus a thin platform switch. This is also the only layer `router/routes.tsx` imports from.
- **`mobile/screens/`** — native-specific UI (different layout/touch targets/safe-area handling), imported by `pages/*` and rendered instead of the inline web content when `usePlatform().isMobile` is true. Reserved for screens with a *real* interaction difference (e.g. auth's safe-area/touch-target handling) — a page-layout-only difference (e.g. the board's tabs-vs-columns, or `PowerToolsPage`/`GroupSettingsPage`'s desktop 2-panel sidebar+drill-down vs mobile's flat page stack) is instead handled with an inline `isMobile` branch in the same `pages/*` file, not a full separate file. `SearchPage` has no mobile variant at all — single shared component, no meaningful platform difference to split on.
- **`components/`** — dumb, presentational building blocks (`components/ui/*`) shared verbatim by both web and mobile UI. See `docs/style-guide.md` for the full primitive set and their conventions (extend native HTML attrs, `className` passthrough, `rounded-card` everywhere).

Platform detection has two flags, both from `lib/platform/usePlatform.ts`: **`isNative`** (`Capacitor.isNativePlatform()`) gates native APIs, and **`isMobile`** (`isNative`, or a web window under 640px) gates layout, so a phone-sized browser renders the mobile UI (plus `MobileWebNotice`) without touching any native-only code. Never pick a layout with a breakpoint of your own. Concretely: **browser-based testing can exercise the mobile layout but never the native-only code path** in anything gated on `isNative`/`Capacitor.getPlatform() === 'web'` (e.g. `lib/db/sqlite.ts`'s native-vs-web branch) — those need an actual device/emulator to verify, not just a resized browser window.

When adding a new screen, follow the same shape: hook in `common_logics/`, web JSX inline in `pages/<Name>Page.tsx` (private component + `isMobile` switch only if the layout actually differs), mobile variant in `mobile/screens/` only if the interaction meaningfully differs.

### Guest-first & routing

The app opens straight to the board (`/`) for everyone — no login/signup gate. Full route table and the `AppShell`/`TopNav`/`BottomNav` chrome: `docs/feat-navigation.md`. `lib/auth/ProtectedRoute.tsx` still exists but is currently unused (kept for Phase 3's account/sync features).

### Offline data layer

All app data (workspaces/groups/notes) lives in local SQLite (`@capacitor-community/sqlite`; `jeep-sqlite`+`sql.js` on web, native binding on native), never touching the backend. Full schema, the CRUD layer's `withDb()` serialization requirement, and **two real version/persistence gotchas already hit once** (a required `sql.js` version pin, and why web writes need an explicit `saveToStore()` flush): `docs/feat-offline-data-layer.md`. Don't touch `lib/db/sqlite.ts`'s connection setup without reading that file first — both gotchas there cost real debugging time to find.

### Workspaces, Groups, Notes

The core data model and UI, in dependency order: a workspace contains groups, a group contains notes (3 types: basic/counter/list). Details, including a few non-obvious things (list notes have no card-level checkmark; a note doesn't get written to the DB until it has a title; the editor saves title/description/status while typing, debounced, and the Diary log coalesces those title/status edits within 3 minutes into one event) worth knowing before touching this code: `docs/feat-workspaces.md`, `docs/feat-groups.md`, `docs/feat-power-tools.md`, `docs/feat-notes.md`, `docs/feat-search-filter.md`.

### Onboarding

First-run intro slides, an interactive board tour, a one-time tour the first time each major feature is opened, and one quiet milestone tip per session. `components/onboarding/OnboardingHost.tsx` (mounted in `App.tsx` as a router sibling, so it reads the route from the exported `router`) decides what runs; tours and tips are data in `lib/onboarding/`. Steps point at elements by `data-tour` attributes, and a step whose element is missing is skipped. Progress flags live in the synced SQLite table `user_state` (`lib/db/userState.ts`), not Preferences. Gotchas worth knowing before touching it: the intro must run before What's new and the feedback prompt (both wait on `useOnboardingPending()`), a feature tour is only marked seen if a step was actually shown, and `ensureUserState` in `initDb` is what stops existing installs from being shown the intro. The default board must keep an unchecked sample note for the tour's check step. The backend half of the flag sync is a contract in `docs/feat-onboarding-sync-from-be.md` (implementation guide: `Taskodoro-Be/docs/feat-onboarding-sync.md`) that is **not deployed yet**: deploy it before releasing this frontend, because an old server silently ignores the flags and the app would mark them synced. Full detail: `docs/feat-onboarding.md`.

### Design system

Self-hosted fonts (never a Google Fonts CDN link — this is an offline-first app), the grid background, and the shared `components/ui/*` primitive set. `docs/style-guide.md`.

- **Dark mode** (`docs/feat-theming.md`): semantic tokens in `src/index.css` re-pointed under `<html data-theme="dark">`, chosen in Settings → Appearance (and a desktop Home toggle), stored in synchronous `localStorage` and applied pre-paint by an inline script in `index.html`. **Don't use raw `bg-white` / `text-ink` / `text-slate-*` / `border-neutral-300` on a canvas or panel surface** — use `bg-panel border-edge`, `bg-paper`, `bg-field`, `text-fg` / `text-body` / `text-muted`, `border-line` / `border-hairline`. Raw classes stay only on "light islands" (chips, note cards, sticky-coloured buttons and what's inside them), which look the same in both themes.
- **Icons** come from one library, `@animateicons/react` (Huge family, pinned exactly). Add icons in `components/ui/icons.ts` and render them with `components/ui/AnimatedIcon.tsx`, never as text characters, inline SVGs or direct library imports. Exceptions: the note checkbox (`CheckCircle`) and the search icon are still PNGs; `AndroidIcon`/`WebVersionIcon` (Settings' About section, cross-platform link) pull `SmartphoneIcon`/`LaptopIcon` from `@animateicons/react/lucide` instead of Huge, which has neither a smartphone-device nor a laptop/monitor glyph — still re-exported from `icons.ts` under app-level names like everything else, just from the other family bundled in the same package.
- **Dropdowns** go through `components/ui/Select.tsx`: a styled Radix Select on web, a native `<select>` on mobile (`isMobile`). It takes an `options` array, not `<option>` children.

### Auth

`lib/auth/AuthContext.tsx` (`AuthProvider`) hydrates from Capacitor Preferences on mount (`status: 'hydrating' | 'authenticated' | 'unauthenticated'`), exposes `login`/`signup`/`loginWithGoogle`/`logout`. **Auth is optional** since the guest-first rework — reached only from Settings' Account section, not required to use the app (see "Guest-first & routing" above). All API calls go through `lib/api/auth.ts` (the only file to touch if the backend contract changes) → `lib/api/client.ts` (fetch wrapper, normalizes errors to `ApiError`). Session persistence is `lib/storage/preferences.ts`, wrapping `@capacitor/preferences` — transparently falls back to `localStorage` on web, so no platform branching is needed there. Full detail: `docs/feat-auth.md`.

Note: `/auth/signup`, `/auth/login`, `/auth/google` and `/auth/me` all return `name` on `user` now (a Phase 3 backend change — it used to be omitted even though signup accepted it). `types/auth.ts`'s `User.name` stays optional regardless, for accounts created before that change.

### Google Sign-In

Web uses `@react-oauth/google`. Native uses **`@southdevs/capacitor-google-auth`** — not `@capacitor-community/google-signin` (referenced in the original plan doc but doesn't exist on npm) and not `@codetrix-studio/capacitor-google-auth` (its usual fallback, stale, capped at Capacitor 6). The backend verifies the ID token's `aud` claim against its own `GOOGLE_CLIENT_ID` (the **Web** client), so both platforms must produce a token whose audience is the Web client ID.

Critical gotcha with this specific native plugin version: its `signIn()` call **ignores** any `clientId`/`serverClientId` passed to it — it only ever uses whatever client was configured during `initialize()`. The Web client ID must be passed as `clientId` to `GoogleAuth.initialize()` (see `lib/google/googleAuthNative.ts`); if omitted, the plugin silently falls back to its own bundled placeholder Android string resource and fails with `DEVELOPER_ERROR (10)` — no account picker, no network request, easy to misdiagnose as a Google Cloud Console misconfiguration.

### Sync (Phase 3)

Optional, account-gated cross-device sync against `POST /sync` on the backend — **gated specifically on having signed in with Google**, not on any authenticated session (email/password login does not turn it on). This is why Settings' "Sync With Google" label was kept as-is rather than generalized, and why `AuthState` tracks an `authMethod: 'password' | 'google' | null` alongside the session (`lib/auth/authContext.ts`, persisted via `preferences.ts`).

- **Local dirty tracking**: every table (`workspaces`/`groups`/`notes`/`templates`/`activity_events`) has a `dirty` column, set on every write, cleared only when a push is acknowledged. A column, not a reused `updated_at` watermark — the sync cursor is opaque and a pulled row carries another device's clock, so a clock-based watermark would either strand rows after a clock jump or re-push just-pulled rows forever. `activity_events` hard-deletes (never tombstones, to match its 3-minute edit-coalescing behavior) — deletions needing to sync are parked in a separate `sync_deleted_events` table until acknowledged.
- **Engine**: `lib/sync/syncEngine.ts`'s `runSync()` collects dirty rows **by entity type** (`collectChanges.ts`, workspaces → groups → notes → templates → activity-event upserts → activity-event deletes), chunked under the server's 2000-row cap, pushes, applies the pull (`applyChanges.ts`), and repeats. Phasing by type (not mixing) satisfies the backend's ownership rule: a workspace must be accepted before anything referencing it ships in the same or a later request.
- **Apply-from-server functions** (`upsert*FromServer` in each `lib/db/*.ts` file) write server rows directly by their own id — never through the existing `create*` functions, which mint their own id and recompute `position` via `SELECT COUNT(*)`. A pulled row's `position` is written verbatim.
- **Triggers**: app foreground (`lib/platform/useAppForeground.ts`), 5s after a local edit (`lib/db/localChange.ts`'s pub/sub), the browser's `online` event, and a manual "Sync Now" in Settings — plus a **device-aware 10s poll**: every `/sync` call sends a per-install `deviceId` (`getOrCreateDeviceId()`, `preferences.ts`), and the response's `deviceActivity.otherDeviceActiveNow` (another device seen in the last 90s) gates a `setInterval(trigger, 10_000)` in `SyncContext.tsx` — only while that's true **and** the app is foregrounded (`lib/platform/useIsAppForeground.ts`, a live boolean, unlike the one-shot `useAppForeground`). No realtime/websocket; this poll is what covers the gap until one of the event-driven triggers fires, and costs nothing on an idle multi-device account.
- **First-sync conflict**: a 409 from the server (this device never synced, the account already has data) surfaces as `SyncStrategyDialog`, rendered from `App.tsx` — "keep this device's data" vs. "use my account's data", each requiring a second `ConfirmDialog` step since both are irreversible and whole-dataset.
- **Logout wipes this device's synced data and reseeds a fresh default board** (`SyncContext.tsx`, on `eligible` going true→false) — every synced table hard-deleted (`wipeSyncedData`, `lib/db/reset.ts`), then `seedIfEmpty` reseeds Workspace 1 like a new install, then the sync cursor is cleared — so the next Google sign-in (same account or a different one) always does a full fresh pull rather than finding, or uploading, the previous account's leftovers. That reseeded board is local data too, so a `markPendingFreshLogin()` marker (`preferences.ts`) tells `syncEngine.ts#doSync` to silently resolve the resulting first-sync conflict as `use_account` rather than surfacing `SyncStrategyDialog` — a conflict for any other reason still prompts as usual. On native, `AuthContext.tsx`'s `logout()` also calls `GoogleAuth.signOut()` (`signOutNative()`, `lib/google/googleAuthNative.ts`) so the native SDK's own cached account doesn't silently re-auth on the next sign-in attempt.
- Full contract: `docs/phase3-sync-plan-from-be.md`. Frontend data inventory and open design decisions: `docs/phase3-sync-plan-from-fe.md`.

### Android-specific runtime gotchas

- **Cleartext HTTP**: Android blocks plain `http://` traffic by default since API 28. Local dev against `http://localhost:8787` requires the debug-only network security config at `android/app/src/debug/res/xml/network_security_config.xml` (+ matching `android/app/src/debug/AndroidManifest.xml` override) permitting cleartext for `localhost`/`10.0.2.2`. Scoped to the `debug` build type only — release builds are unaffected.
- **CORS origin**: Capacitor's Android WebView serves the app from origin `https://localhost` by default — not the web dev origin (`http://localhost:5173`). The backend's CORS allowlist must include both origins, or native requests will pass preflight (`OPTIONS` returns 204) but the browser will still refuse to send the actual request.
- **SQLite version pin**: `sql.js` must stay pinned to exactly the version `jeep-sqlite`'s bundled glue was built against (currently `1.11.0`, see `docs/feat-offline-data-layer.md`) — a routine `npm update` here will break web (not native) with an opaque `LinkError` at WASM instantiation.
- `android/` is a generated Capacitor native project (gitignored build artifacts under `android/app/build/`) and is excluded from ESLint's scope in `eslint.config.js`.
- **Back button/edge-swipe exits the app by default**: Capacitor's `BridgeActivity` has no built-in "walk the WebView/router history" behavior — without a `@capacitor/app` `backButton` listener, every back press (hardware button or the right-edge gesture-nav swipe) just exits the activity outright. Handled by `src/lib/platform/useAndroidBackButton.ts`; see `docs/feat-navigation.md`'s "Android hardware back button / edge-swipe" section.

### Local Android device testing

`adb reverse tcp:8787 tcp:8787` forwards the phone's `localhost:8787` to the dev machine over USB — this is what `npm run android` sets up automatically, and it's why `.env.local`'s `VITE_API_BASE_URL=http://localhost:8787` works unchanged on-device (no LAN IP juggling needed). This is only relevant for the optional backend-dependent features (sign-in); the app's core offline functionality needs no network at all. See `Taskodoro-Frontend-Plan.md` §4 for the alternative Wi-Fi/tunnel options. To test against the deployed backend instead (no local server, no USB tunnel needed), use `npm run android:prod` — see "Production backend" above.
