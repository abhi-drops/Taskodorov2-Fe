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

`/auth/signup`, `/auth/login`, `/auth/google` and `/auth/me` all return `name` on `user`
now (a Phase 3 backend change — they used to omit it even though signup accepted it).
`User.name` stays optional in `types/auth.ts`: non-breaking either way, and still
correct for any account created before the backend started populating it.

**`authMethod` (Phase 3)**: `AuthState` also tracks how the current session signed in —
`'password' | 'google' | null` — persisted alongside the token/user
(`taskodoro.auth.method` in `preferences.ts`, set by `login`/`signup`('password') and
`loginWithGoogle`('google'), cleared on `logout()`). Nothing in this file's own state
machine reads it; it exists so `lib/sync/SyncContext.tsx` can gate sync on
`authMethod === 'google'` specifically, without `AuthContext.tsx` importing anything
from `lib/sync/` or `lib/db/` itself. See `feat-power-tools.md`'s "Sync With Google".

**401 handling (Phase 3)**: `client.ts`'s `request()` has no interceptor of its own —
a 401 from any endpoint still just becomes a generic `ApiError`. `lib/sync/syncEngine.ts`
classifies a sync call's 401 as `'unauthorized'`, and `SyncContext.tsx` is what actually
calls `auth.logout()` in response. There's still no token refresh (tokens are 7 days);
an expired session surfaces as "log in again to sync" rather than silently retrying.

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

**Second gotcha, native only: the Google SDK remembers the last account independently
of our own session.** `logout()` only ever cleared our own `taskodoro.auth.*`
Preferences keys — it never told the native Google SDK to forget anything, so
`GoogleAuth.signIn()` after a logout silently re-authenticated with whichever Google
account was used last, with no account picker shown (reported on Android: sign out, tap
log in, land back on the same account instead of being able to pick a different one).
Fixed by `lib/google/googleAuthNative.ts`'s `signOutNative()` — `GoogleAuth.signOut()`,
called from `AuthContext.tsx`'s `logout()` whenever `isNative()` — which clears the
SDK's cached credential so the next `signIn()` shows the picker again. Requires
`ensureInit()` first (the plugin's `signOut()` needs the native client to already
exist, both on native and in this plugin's web fallback — not what web sign-in actually
uses, but the function still no-ops safely if `isGoogleNativeConfigured()` is false).
Wrapped in try/catch: a failure here (e.g. no native session ever existed this install)
shouldn't block the rest of logout. If only one Google account exists on the device,
Android still won't show a picker after this fix — that's expected OS behavior, not a
bug, nothing left to switch to.

This pairs with a second, separate fix for the same underlying complaint: even with
the picker working, the *local data* from the account being signed out of was still
sitting in SQLite and could leak into (or get silently overwritten by) whichever
account signed in next. `AuthContext.tsx`'s own `logout()` stays a pure
session/credentials concern with no `lib/db/*` dependency — the data-wiping half of
that fix lives in `lib/sync/SyncContext.tsx` instead, which already watches auth state
for sync purposes. See `feat-sync.md`'s "Cursor storage, and why logout wipes local
data".
