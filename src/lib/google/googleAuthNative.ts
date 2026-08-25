import { GoogleAuth } from '@southdevs/capacitor-google-auth'
import { GOOGLE_CLIENT_ID_WEB } from './googleAuthWeb'

// The backend verifies the ID token's `aud` claim against its GOOGLE_CLIENT_ID,
// which is the Web client. So the native flow must request a token whose audience
// is the Web client too (via serverClientId below) — VITE_GOOGLE_CLIENT_ID_ANDROID
// only needs to exist as a registered OAuth client in Google Cloud Console (matched
// by package name + signing SHA-1) so Play Services trusts the app; its value is
// never read here.
export const isGoogleNativeConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID_WEB)

let initialized = false

async function ensureInit(): Promise<void> {
  if (!isGoogleNativeConfigured() || initialized) return
  await GoogleAuth.initialize({ scopes: ['profile', 'email'] })
  initialized = true
}

export async function signIn(): Promise<string> {
  await ensureInit()
  const result = await GoogleAuth.signIn({
    scopes: ['profile', 'email'],
    serverClientId: GOOGLE_CLIENT_ID_WEB,
  })
  return result.authentication.idToken
}
