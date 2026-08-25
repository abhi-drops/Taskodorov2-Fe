# Google Sign-In — Frontend Setup & Testing Notes (Web + Android)

Backend contract (already implemented, `Taskodoro-Be/src/routes/auth.ts`):

```
POST /auth/google
Body: { "idToken": "<Google ID token, JWT>" }
Response: { "token": "<app JWT>", "user": { "id", "email" } }
```

The backend verifies the ID token's signature against Google's live JWKS and checks that its `aud` claim equals `GOOGLE_CLIENT_ID` (set in `Taskodoro-Be/.dev.vars`) and its issuer is `accounts.google.com`. **Whatever token you send — from web or Android — must have that same Web Client ID as its audience.** That's the key constraint everything below is built around.

---

## 1. Google Cloud Console setup

You need **two** OAuth clients registered under the same project, but only one Client ID actually appears in app code / env vars.

**Web Client** (already created — this is the value in `Taskodoro-Be/.dev.vars` → `GOOGLE_CLIENT_ID`, and `VITE_GOOGLE_CLIENT_ID_WEB` here)
- Console → APIs & Services → Credentials → this Client ID's **Authorized JavaScript origins** must include `http://localhost:5173`

**Android Client** (needed so Google Play Services will authorize the native sign-in flow at all — required to exist, but its ID string isn't referenced directly in code)
- Console → Credentials → Create Credentials → OAuth client ID → type **Android**
- Package name: `com.taskodoro.app` (from `capacitor.config.ts`)
- SHA-1 certificate fingerprint of your **debug** keystore:
  ```
  cd android && ./gradlew signingReport
  # or
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- Put this Client ID in `VITE_GOOGLE_CLIENT_ID_ANDROID` (used optionally, see below) — Google matches the app by package name + signing cert automatically once this client exists, regardless of whether you reference its ID in code.

Without the Android client registered, native sign-in fails with `DEVELOPER_ERROR` even if the web client is configured correctly.

---

## 2. Making the Android ID token carry the Web Client ID as audience

The installed plugin is `@southdevs/capacitor-google-auth` (a fork of `@codetrix-studio/capacitor-google-auth` — note the frontend plan doc still references the older `@capacitor-community/google-signin`, which isn't what's actually installed).

Set `serverClientId` to the **Web** Client ID in `capacitor.config.ts` — this is what makes the plugin request an ID token whose `aud` is the web client, on both web and native:

```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.taskodoro.app',
  appName: 'Taskodoro',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB,
    },
  },
}
```

On native Android, the plugin still needs the Android client to exist in Console (step 1) for Play Services to trust the app — but the returned `authentication.idToken` will have `aud = serverClientId` (the web ID), matching what the backend expects. You generally do **not** need to also pass `androidClientId` explicitly when `serverClientId` is set — it's lower priority than `serverClientId`/`clientId` per the plugin's resolution order.

---

## 3. Web flow (`@react-oauth/google`)

```tsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB}>
  <GoogleLogin
    onSuccess={async (credentialResponse) => {
      const idToken = credentialResponse.credential // JWT, ready to send as-is
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const { token, user } = await res.json()
      // store `token` via Capacitor Preferences, set auth state from `user`
    }}
  />
</GoogleOAuthProvider>
```

`credentialResponse.credential` from `@react-oauth/google` is already the raw ID token JWT — send it straight through, no decoding needed.

## 4. Android native flow

```ts
import { GoogleAuth } from '@southdevs/capacitor-google-auth'

await GoogleAuth.initialize() // reads capacitor.config.ts plugin block
const googleUser = await GoogleAuth.signIn()
const idToken = googleUser.authentication.idToken

const res = await fetch(`${API_BASE_URL}/auth/google`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken }),
})
```

---

## 5. Test checklist

**Web**
1. `cd Taskodoro-Be && npm run dev` (backend on `:8787`)
2. `cd Taskodoro-Fe && npm run dev` (Vite on `:5173`)
3. Open `http://localhost:5173`, click Google Sign-In, pick an account
4. Check Network tab: `POST /auth/google` → `200`, response has `token` + `user`
5. Re-run signup with the same Google email manually first, then sign in with Google — should reuse the existing user row (backend links `googleId` to the existing account) rather than erroring

**Android** (per `Taskodoro-Frontend-Plan.md` §4 — adb reverse recommended)
1. Backend running locally on `:8787`
2. `npm run build && npx cap sync android`
3. Connect phone via USB, `adb reverse tcp:8787 tcp:8787`
4. `VITE_API_BASE_URL=http://localhost:8787` (adb reverse makes this work on-device)
5. `npx cap run android` (or open in Android Studio and run)
6. Trigger Google Sign-In — native account picker should appear (not a WebView popup — if you see a WebView-based Google login instead of the native picker, the plugin isn't wired up correctly)
7. Same `/auth/google` success check as web

**Common failure signatures**
| Symptom | Likely cause |
|---|---|
| Backend returns `401 invalid Google ID token` | `serverClientId` not set (or set to the wrong/Android client), so token audience doesn't match backend's `GOOGLE_CLIENT_ID` |
| Android `DEVELOPER_ERROR` on sign-in | Android OAuth client missing in Console, or SHA-1/package name mismatch (debug vs release keystore) |
| Web: "The given origin is not allowed" | Web Client's Authorized JavaScript origins doesn't include `http://localhost:5173` |
| Works on web, fails only on Android | Almost always the Android client registration or `serverClientId` wiring — re-check step 1 & 2 |
