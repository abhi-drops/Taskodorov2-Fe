# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskodoro frontend: a React 19 + Vite + TypeScript app wrapped with Capacitor to run on both web and Android from one codebase. It talks to a separate backend (`Taskodoro-Be`, not in this repo) running locally at `http://localhost:8787` during development.

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

## Architecture

### Web/mobile split with shared logic

Every screen follows the same three-way split:
- **`common_logics/`** — platform-agnostic hooks (no JSX): all form state, validation, and submit logic (`useLoginForm`, `useSignupForm`, `useGoogleSignIn`). Both web and mobile UI consume the exact same hook.
- **`pages/`** — the web UI implementation lives directly here (as a private, unexported component in the same file) plus a thin platform switch. This is also the only layer `router/routes.tsx` imports from.
- **`mobile/screens/`** — native-specific UI (different layout/touch targets/safe-area handling), imported by `pages/*` and rendered instead of the inline web content when `usePlatform().isNative` is true.
- **`components/`** — dumb, presentational building blocks (`components/ui/*`) shared verbatim by both web and mobile UI.

Platform detection is always `Capacitor.isNativePlatform()` (wrapped in `lib/platform/usePlatform.ts`), never a viewport-width breakpoint — a native Android WebView and a narrow browser window must be distinguishable.

When adding a new screen, follow the same shape: hook in `common_logics/`, web JSX inline in `pages/<Name>Page.tsx` (private component + `isNative` switch), mobile variant in `mobile/screens/`.

### Auth

`lib/auth/AuthContext.tsx` (`AuthProvider`) hydrates from Capacitor Preferences on mount (`status: 'hydrating' | 'authenticated' | 'unauthenticated'`), exposes `login`/`signup`/`loginWithGoogle`/`logout`. `lib/auth/ProtectedRoute.tsx` wraps protected routes and redirects to `/login` — it holds off redirecting while `status === 'hydrating'` to avoid a flash. All API calls go through `lib/api/auth.ts` (the only file to touch if the backend contract changes) → `lib/api/client.ts` (fetch wrapper, normalizes errors to `ApiError`). Session persistence is `lib/storage/preferences.ts`, wrapping `@capacitor/preferences` — transparently falls back to `localStorage` on web, so no platform branching is needed there.

Note: the real backend's `/auth/signup` and `/auth/login` responses only include `{id, email}` on `user` — no `name`, even though signup accepts a `name` in the payload. `types/auth.ts`'s `User.name` is optional to reflect this; `PlaceholderHome` falls back to displaying the email when `name` is absent.

### Google Sign-In

Web uses `@react-oauth/google`. Native uses **`@southdevs/capacitor-google-auth`** — not `@capacitor-community/google-signin` (referenced in the original plan doc but doesn't exist on npm) and not `@codetrix-studio/capacitor-google-auth` (its usual fallback, stale, capped at Capacitor 6). The backend verifies the ID token's `aud` claim against its own `GOOGLE_CLIENT_ID` (the **Web** client), so both platforms must produce a token whose audience is the Web client ID.

Critical gotcha with this specific native plugin version: its `signIn()` call **ignores** any `clientId`/`serverClientId` passed to it — it only ever uses whatever client was configured during `initialize()`. The Web client ID must be passed as `clientId` to `GoogleAuth.initialize()` (see `lib/google/googleAuthNative.ts`); if omitted, the plugin silently falls back to its own bundled placeholder Android string resource and fails with `DEVELOPER_ERROR (10)` — no account picker, no network request, easy to misdiagnose as a Google Cloud Console misconfiguration.

### Android-specific runtime gotchas

- **Cleartext HTTP**: Android blocks plain `http://` traffic by default since API 28. Local dev against `http://localhost:8787` requires the debug-only network security config at `android/app/src/debug/res/xml/network_security_config.xml` (+ matching `android/app/src/debug/AndroidManifest.xml` override) permitting cleartext for `localhost`/`10.0.2.2`. Scoped to the `debug` build type only — release builds are unaffected.
- **CORS origin**: Capacitor's Android WebView serves the app from origin `https://localhost` by default — not the web dev origin (`http://localhost:5173`). The backend's CORS allowlist must include both origins, or native requests will pass preflight (`OPTIONS` returns 204) but the browser will still refuse to send the actual request.
- `android/` is a generated Capacitor native project (gitignored build artifacts under `android/app/build/`) and is excluded from ESLint's scope in `eslint.config.js`.

### Local Android device testing

`adb reverse tcp:8787 tcp:8787` forwards the phone's `localhost:8787` to the dev machine over USB — this is what `npm run android` sets up automatically, and it's why `.env.local`'s `VITE_API_BASE_URL=http://localhost:8787` works unchanged on-device (no LAN IP juggling needed). See `Taskodoro-Frontend-Plan.md` §4 for the alternative Wi-Fi/tunnel options.
