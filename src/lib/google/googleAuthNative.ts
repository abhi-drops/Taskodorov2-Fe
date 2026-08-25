import { GoogleAuth } from '@southdevs/capacitor-google-auth'

export const GOOGLE_CLIENT_ID_ANDROID = import.meta.env.VITE_GOOGLE_CLIENT_ID_ANDROID

export const isGoogleNativeConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID_ANDROID)

let initialized = false

async function ensureInit(): Promise<void> {
  if (!isGoogleNativeConfigured() || initialized) return
  await GoogleAuth.initialize({
    clientId: GOOGLE_CLIENT_ID_ANDROID,
    scopes: ['profile', 'email'],
  })
  initialized = true
}

export async function signIn(): Promise<string> {
  await ensureInit()
  const result = await GoogleAuth.signIn({ scopes: ['profile', 'email'] })
  return result.authentication.idToken
}
