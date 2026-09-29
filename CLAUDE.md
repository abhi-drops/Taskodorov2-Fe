# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskodoro frontend: a React 19 + Vite + TypeScript app wrapped with Capacitor to run on both web and Android from one codebase. Guest-first and offline-first — the app is fully usable with zero account, all data stored locally on-device via SQLite. It optionally talks to a separate backend (`Taskodoro-Be`, not in this repo) running locally at `http://localhost:8787` during development, only for the opt-in account/sign-in features reached from Settings (formerly "Power Tools" — internal file/component names like `PowerToolsPage` kept the old name).

## Commands

```bash
npm run dev              # Vite dev server (web)
npm run build             # tsc -b && vite build — type-check then bundle
npm run lint               # eslint .
npm run preview            # serve the production build locally
npm run android            # build + cap sync + adb reverse tcp:8787 + install & launch on connected device/emulator
```

There is no test runner configured in this repo.

Android builds require `java` (JDK 21+ — the Capacitor Android core library needs Java source release 21, not 17) and `adb`/Android SDK tools on `PATH`, plus `ANDROID_HOME`/`ANDROID_SDK_ROOT` set. `npm run android` assumes these are already available in the shell.

## Environment

Copy `.env.example` to `.env.local` (gitignored) and fill in:
- `VITE_API_BASE_URL` — backend base URL (defaults to `http://localhost:8787` in code if unset)
- `VITE_GOOGLE_CLIENT_ID_WEB` — Google OAuth **Web** client ID. Leave blank to keep Google Sign-In visibly present but disabled (no crash) on both platforms — see `isGoogleWebConfigured`/`isGoogleNativeConfigured`.
- `VITE_GOOGLE_CLIENT_ID_ANDROID` — documentation only, not read by any code path. The Android OAuth client only needs to exist in Google Cloud Console (matched by package name `com.taskodoro.app` + debug signing SHA-1, get via `cd android && ./gradlew signingReport`); its ID value is never used at runtime. See `GOOGLE_SIGNIN_TESTING.md` for full Google Cloud Console setup and the debug-SHA-1 registration flow.

## Documentation

- **`docs/feat-*.md`** — one file per major feature (auth, offline-data-layer, navigation, workspaces, groups, power-tools (= Settings), apps, notes, search-filter, design-system). This is where feature *behavior and rationale* lives in depth; this file (`CLAUDE.md`) stays a high-level map plus the gotchas sharp enough to bite someone.
- **`docs/changelog.md`** — running log of what changed and when, newest entry first.
  **After any meaningful change to this codebase (a new feature, a real bug fix, a
  behavior change — not a typo fix or a pure refactor with no behavior change), add an
  entry to the top of `docs/changelog.md`** summarizing what changed and why, and link
  to (or update) the relevant `docs/feat-*.md` file. If the change adds or
  substantially changes a feature, update or create the matching `feat-*.md` too — the
  changelog is a log entry, not a substitute for the feature doc staying accurate.
- **`docs/phase2-roadmap.md`**, **`docs/phase2-offline-first-plan.md`** — the planning
  docs Phase 2 was built from; mostly historical now that Phase 2 is complete, but
  still the record of *why* certain decisions were made (kept for that reason, not
  meant to be re-read as current-state documentation — `feat-*.md` is current-state).

## Architecture

### Web/mobile split with shared logic

Every screen follows the same three-way split:
- **`common_logics/`** — platform-agnostic hooks (no JSX): all form/state/validation/submit logic. Both web and mobile UI consume the exact same hook.
- **`pages/`** — the web UI implementation lives directly here (as a private, unexported component in the same file) plus a thin platform switch. This is also the only layer `router/routes.tsx` imports from.
- **`mobile/screens/`** — native-specific UI (different layout/touch targets/safe-area handling), imported by `pages/*` and rendered instead of the inline web content when `usePlatform().isNative` is true. Reserved for screens with a *real* interaction difference (e.g. auth's safe-area/touch-target handling) — a page-layout-only difference (e.g. the board's tabs-vs-columns, or `PowerToolsPage`/`GroupSettingsPage`'s desktop 2-panel sidebar+drill-down vs mobile's flat page stack) is instead handled with an inline `isNative` branch in the same `pages/*` file, not a full separate file. `SearchPage` has no mobile variant at all — single shared component, no meaningful platform difference to split on.
- **`components/`** — dumb, presentational building blocks (`components/ui/*`) shared verbatim by both web and mobile UI. See `docs/style-guide.md` for the full primitive set and their conventions (extend native HTML attrs, `className` passthrough, `rounded-card` everywhere).

Platform detection is always `Capacitor.isNativePlatform()` (wrapped in `lib/platform/usePlatform.ts`), never a viewport-width breakpoint — a native Android WebView and a narrow browser window must be distinguishable. Concretely: this also means **browser-based testing can never exercise the native-only code path** in anything gated on `isNative`/`Capacitor.getPlatform() === 'web'` (e.g. `lib/db/sqlite.ts`'s native-vs-web branch) — those need an actual device/emulator to verify, not just a resized browser window.

When adding a new screen, follow the same shape: hook in `common_logics/`, web JSX inline in `pages/<Name>Page.tsx` (private component + `isNative` switch only if the layout actually differs), mobile variant in `mobile/screens/` only if the interaction meaningfully differs.

### Guest-first & routing

The app opens straight to the board (`/`) for everyone — no login/signup gate. Full route table and the `AppShell`/`TopNav`/`BottomNav` chrome: `docs/feat-navigation.md`. `lib/auth/ProtectedRoute.tsx` still exists but is currently unused (kept for Phase 3's account/sync features).

### Offline data layer

All app data (workspaces/groups/notes) lives in local SQLite (`@capacitor-community/sqlite`; `jeep-sqlite`+`sql.js` on web, native binding on native), never touching the backend. Full schema, the CRUD layer's `withDb()` serialization requirement, and **two real version/persistence gotchas already hit once** (a required `sql.js` version pin, and why web writes need an explicit `saveToStore()` flush): `docs/feat-offline-data-layer.md`. Don't touch `lib/db/sqlite.ts`'s connection setup without reading that file first — both gotchas there cost real debugging time to find.

### Workspaces, Groups, Notes

The core data model and UI, in dependency order: a workspace contains groups, a group contains notes (3 types: basic/counter/list). Details, including two non-obvious things (list notes have no card-level checkmark; a note doesn't get written to the DB until it has a title) worth knowing before touching this code: `docs/feat-workspaces.md`, `docs/feat-groups.md`, `docs/feat-power-tools.md`, `docs/feat-notes.md`, `docs/feat-search-filter.md`.

### Design system

Self-hosted fonts (never a Google Fonts CDN link — this is an offline-first app), the grid background, and the shared `components/ui/*` primitive set. `docs/style-guide.md`.

### Auth

`lib/auth/AuthContext.tsx` (`AuthProvider`) hydrates from Capacitor Preferences on mount (`status: 'hydrating' | 'authenticated' | 'unauthenticated'`), exposes `login`/`signup`/`loginWithGoogle`/`logout`. **Auth is optional** since the guest-first rework — reached only from Settings' Account section, not required to use the app (see "Guest-first & routing" above). All API calls go through `lib/api/auth.ts` (the only file to touch if the backend contract changes) → `lib/api/client.ts` (fetch wrapper, normalizes errors to `ApiError`). Session persistence is `lib/storage/preferences.ts`, wrapping `@capacitor/preferences` — transparently falls back to `localStorage` on web, so no platform branching is needed there. Full detail: `docs/feat-auth.md`.

Note: the real backend's `/auth/signup` and `/auth/login` responses only include `{id, email}` on `user` — no `name`, even though signup accepts a `name` in the payload. `types/auth.ts`'s `User.name` is optional to reflect this.

### Google Sign-In

Web uses `@react-oauth/google`. Native uses **`@southdevs/capacitor-google-auth`** — not `@capacitor-community/google-signin` (referenced in the original plan doc but doesn't exist on npm) and not `@codetrix-studio/capacitor-google-auth` (its usual fallback, stale, capped at Capacitor 6). The backend verifies the ID token's `aud` claim against its own `GOOGLE_CLIENT_ID` (the **Web** client), so both platforms must produce a token whose audience is the Web client ID.

Critical gotcha with this specific native plugin version: its `signIn()` call **ignores** any `clientId`/`serverClientId` passed to it — it only ever uses whatever client was configured during `initialize()`. The Web client ID must be passed as `clientId` to `GoogleAuth.initialize()` (see `lib/google/googleAuthNative.ts`); if omitted, the plugin silently falls back to its own bundled placeholder Android string resource and fails with `DEVELOPER_ERROR (10)` — no account picker, no network request, easy to misdiagnose as a Google Cloud Console misconfiguration.

### Android-specific runtime gotchas

- **Cleartext HTTP**: Android blocks plain `http://` traffic by default since API 28. Local dev against `http://localhost:8787` requires the debug-only network security config at `android/app/src/debug/res/xml/network_security_config.xml` (+ matching `android/app/src/debug/AndroidManifest.xml` override) permitting cleartext for `localhost`/`10.0.2.2`. Scoped to the `debug` build type only — release builds are unaffected.
- **CORS origin**: Capacitor's Android WebView serves the app from origin `https://localhost` by default — not the web dev origin (`http://localhost:5173`). The backend's CORS allowlist must include both origins, or native requests will pass preflight (`OPTIONS` returns 204) but the browser will still refuse to send the actual request.
- **SQLite version pin**: `sql.js` must stay pinned to exactly the version `jeep-sqlite`'s bundled glue was built against (currently `1.11.0`, see `docs/feat-offline-data-layer.md`) — a routine `npm update` here will break web (not native) with an opaque `LinkError` at WASM instantiation.
- `android/` is a generated Capacitor native project (gitignored build artifacts under `android/app/build/`) and is excluded from ESLint's scope in `eslint.config.js`.
- **Back button/edge-swipe exits the app by default**: Capacitor's `BridgeActivity` has no built-in "walk the WebView/router history" behavior — without a `@capacitor/app` `backButton` listener, every back press (hardware button or the right-edge gesture-nav swipe) just exits the activity outright. Handled by `src/lib/platform/useAndroidBackButton.ts`; see `docs/feat-navigation.md`'s "Android hardware back button / edge-swipe" section.

### Local Android device testing

`adb reverse tcp:8787 tcp:8787` forwards the phone's `localhost:8787` to the dev machine over USB — this is what `npm run android` sets up automatically, and it's why `.env.local`'s `VITE_API_BASE_URL=http://localhost:8787` works unchanged on-device (no LAN IP juggling needed). This is only relevant for the optional backend-dependent features (sign-in); the app's core offline functionality needs no network at all. See `Taskodoro-Frontend-Plan.md` §4 for the alternative Wi-Fi/tunnel options.
