# Feature: Authentication

Manual email/password + Google Sign-In. Built in Phase 1 as the whole app's gate;
**since Phase 2's guest-first rework, auth is fully optional** — see
`feat-navigation.md`. The system itself (state machine, API layer, session storage)
didn't change, only its role: `/login`/`/signup` are now reached from Power Tools'
Account section (`feat-power-tools.md`), not forced at the door.

## State machine (`src/lib/auth/`)

`AuthContext.ts` (types + context) → `AuthContext.tsx` (`AuthProvider`, hydrates from
Capacitor Preferences on mount, `status: 'hydrating' | 'authenticated' |
'unauthenticated'`) → `useAuth.ts` (consumer hook) → `ProtectedRoute.tsx` (route guard,
**currently unused** — nothing routes through it post-guest-first, kept for Phase 3).
This exact 4-file shape is the template every later global-state addition in this app
followed (`lib/workspace/`, see `feat-workspaces.md`).

`login`/`signup`/`loginWithGoogle` call `lib/api/auth.ts` → `lib/api/client.ts` (fetch
wrapper, normalizes errors to `ApiError`), persist via `lib/storage/preferences.ts`
(wraps `@capacitor/preferences`, keys `taskodoro.auth.token`/`taskodoro.auth.user` —
transparently backed by `localStorage` on web, no platform branching needed in calling
code). `logout()` clears both.

Backend quirk: `/auth/signup` and `/auth/login` responses only include `{id, email}` on
`user`, never `name`, even though signup accepts a `name` in the payload. `User.name`
is optional in `types/auth.ts` to reflect this.

## Google Sign-In

Web: `@react-oauth/google`. Native: `@southdevs/capacitor-google-auth` — not
`@capacitor-community/google-signin` (doesn't exist on npm) or
`@codetrix-studio/capacitor-google-auth` (stale, capped at Capacitor 6). Both platforms
must produce an ID token audienced to the backend's **Web** `GOOGLE_CLIENT_ID`, since
that's what the backend verifies against regardless of sending platform.

Critical gotcha: the native plugin's `signIn()` **ignores** any `clientId` passed to
it directly — only whatever was set during `GoogleAuth.initialize()`. The Web client ID
must be passed there (`lib/google/googleAuthNative.ts`); omitting it silently falls
back to a bundled placeholder Android resource and fails with `DEVELOPER_ERROR (10)` —
no account picker, no network request, easy to misdiagnose as a Cloud Console
misconfiguration. Full setup/testing checklist: `GOOGLE_SIGNIN_TESTING.md`.

`isGoogleWebConfigured()`/`isGoogleNativeConfigured()` both just check
`Boolean(VITE_GOOGLE_CLIENT_ID_WEB)` — unset renders the button visibly present but
disabled, never crashes.
