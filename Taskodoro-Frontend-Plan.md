# Taskodoro — Frontend Plan

## Phase 1: Project Setup + Auth + Local Backend Connection

### Goal
Get a working React + Capacitor app running on **web** and **Android**, with auth wired up and able to talk to the local backend during development.

---

## 1. Project Setup

- [ ] Init React project (Vite recommended — fast, lightweight, plays well with Capacitor)
  ```
  npm create vite@latest taskodoro -- --template react-ts
  ```
- [ ] Install Capacitor core + CLI
  ```
  npm install @capacitor/core @capacitor/cli
  npx cap init
  ```
- [ ] Add Android platform
  ```
  npm install @capacitor/android
  npx cap add android
  ```
- [ ] Confirm web build works standalone (`npm run dev`) before touching native
- [ ] Set up `.env` handling for local vs. prod API URLs (Vite uses `import.meta.env`)
- [ ] Basic folder structure: `/screens`, `/components`, `/hooks`, `/lib` (api client, auth), `/types`

---

## 2. Auth Implementation

- [ ] Manual login/signup screens (email + password form)
- [ ] Google Sign-In integration
  - Web: Google Identity Services (`@react-oauth/google` or similar)
  - Android native: `@capacitor-community/google-signin` (native flow differs from web — needs its own SDK config in Google Cloud Console)
  - Both should resolve to the same backend `/auth/google` endpoint, sending an ID token for backend verification
- [ ] Store session token (JWT from backend) — use Capacitor Preferences API (`@capacitor/preferences`) instead of localStorage, since it works consistently across web + native
- [ ] Auth context/hook (`useAuth`) to gate routes and expose current user
- [ ] Basic protected route wrapper

---

## 3. Connecting to Local Backend (Dev)

- [ ] Confirm backend is running locally (see Backend Plan — Phase 1)
- [ ] Point frontend `.env` API base URL to local backend
  - **Web (browser):** `http://localhost:8787` (or whatever port Wrangler dev uses) works fine directly
  - **Android emulator:** use `http://10.0.2.2:8787` instead of `localhost` — Android emulator maps `10.0.2.2` to the host machine's `localhost`
  - **Physical Android phone:** see "Testing on a Real Device" below — `localhost`/`10.0.2.2` won't work here

---

## 4. Testing on a Real Android Phone (Local Backend)

Since your laptop runs the backend and your phone is a separate device, they need to reach each other over the network.

**Option A — Same Wi-Fi, use laptop's LAN IP (simplest)**
- [ ] Find your laptop's local IP (e.g. `192.168.1.x`) via `ipconfig` (Windows) or `ip a` / `ifconfig` (Linux/Mac)
- [ ] Make sure Wrangler dev server binds to `0.0.0.0`, not just `localhost`, so it's reachable from other devices:
  ```
  wrangler dev --ip 0.0.0.0
  ```
- [ ] Set frontend API URL to `http://192.168.1.x:8787` (your laptop's IP + backend port)
- [ ] Ensure laptop firewall allows inbound connections on that port
- [ ] Phone and laptop must be on the **same Wi-Fi network**

**Option B — USB + adb reverse (no Wi-Fi dependency, more reliable)**
- [ ] Connect phone via USB, enable USB debugging
- [ ] Run:
  ```
  adb reverse tcp:8787 tcp:8787
  ```
  This forwards the phone's `localhost:8787` to your laptop's `localhost:8787` over USB
- [ ] Frontend API URL can then just be `http://localhost:8787` even on the physical device
- [ ] More reliable than Wi-Fi IP (no network/firewall flakiness), but requires USB connection every session

**Option C — Tunnel (if testing away from same network)**
- [ ] Use `cloudflared tunnel` (pairs naturally since backend is already on Cloudflare) or `ngrok` to expose local backend via a public URL
- [ ] Point frontend API URL to the tunnel URL
- [ ] Useful for testing on the go, but adds latency and isn't needed for basic same-room dev

**Recommendation:** Start with **Option B (adb reverse)** — most stable for daily dev work, avoids Wi-Fi/firewall issues entirely.

---

## 5. Build + Run on Android

- [ ] Build web assets: `npm run build`
- [ ] Sync to native project: `npx cap sync android`
- [ ] Open in Android Studio: `npx cap open android`
- [ ] Run on connected device/emulator from Android Studio
- [ ] Repeat `build` → `sync` after any frontend code change (or use `npx cap run android` for a faster dev loop)

---

## Phase 1 Definition of Done
- [ ] App builds and runs on web (browser)
- [ ] App builds and runs on physical Android device
- [ ] User can sign up / log in manually
- [ ] User can sign in with Google (both web and Android)
- [ ] Authenticated requests successfully reach local backend and return data
- [ ] Session persists across app restarts (via Capacitor Preferences)
