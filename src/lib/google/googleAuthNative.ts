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
