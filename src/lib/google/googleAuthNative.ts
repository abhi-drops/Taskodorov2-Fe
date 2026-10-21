import { GoogleAuth } from '@southdevs/capacitor-google-auth'
import { GOOGLE_CLIENT_ID_WEB } from './googleAuthWeb'

// The backend verifies the ID token's `aud` claim against its GOOGLE_CLIENT_ID,
// which is the Web client. This plugin's signIn() ignores any clientId/serverClientId
// passed to it — it only ever uses whatever GoogleSignInClient was built during
// initialize(), so the Web client ID must be passed there instead. Without it, the
// plugin falls back to its own bundled placeholder Android string resource
// ("Your Web Client Key"), which Google rejects immediately with DEVELOPER_ERROR (10).
// VITE_GOOGLE_CLIENT_ID_ANDROID only needs to exist as a registered OAuth client in
// Google Cloud Console (matched by package name + signing SHA-1) so Play Services
// trusts the app; its value is never read here.
export const isGoogleNativeConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID_WEB)

let initialized = false

async function ensureInit(): Promise<void> {
  if (!isGoogleNativeConfigured() || initialized) return
  await GoogleAuth.initialize({ scopes: ['profile', 'email'], clientId: GOOGLE_CLIENT_ID_WEB })
  initialized = true
}

export async function signIn(): Promise<string> {
  await ensureInit()
  const result = await GoogleAuth.signIn({ scopes: ['profile', 'email'] })
  return result.authentication.idToken
}

/**
 * Clears the native Google SDK's own cached account, independent of our app's own
 * session. Without this, `GoogleAuth.signIn()` after logging out silently re-signs the
 * user back into whichever Google account was last used — the SDK's own session
 * outlives our `clearAuth()`, which only ever touched our Preferences keys, never told
 * Google to forget anything. Call before `signIn()` whenever the user needs to pick a
 * *different* account (logout, or an explicit "switch account" action), not just once
 * at sign-in time, since by then it's too late — the picker is already being skipped.
 *
 * `ensureInit()` first because `GoogleAuth.signOut()` needs the native
 * `GoogleSignInClient` to already exist (built during `initialize()`) — without it the
 * call throws rather than no-opping, both natively and in this plugin's web fallback
 * (`gapi.auth2.getAuthInstance()` requires `gapi.auth2` to be loaded first). Caught
 * rather than rethrown: a failure here (e.g. no native session ever existed) shouldn't
 * block the rest of logout.
 */
export async function signOutNative(): Promise<void> {
  if (!isGoogleNativeConfigured()) return
  try {
    await ensureInit()
    await GoogleAuth.signOut()
  } catch (err) {
    console.warn('GoogleAuth.signOut() failed (likely no native Google session to clear):', err)
  }
}
