# App Update Check

Status: **implemented on both backend and frontend.** §§1-4 below document the
`Taskodoro-Be` contract as built — the counterpart to how `phase3-sync-plan-from-be.md`
documents `/sync`. No frontend planning doc preceded this one; the backend was asked
for directly. §6 documents what the frontend actually does with it.

---

## 1. Endpoint

**`GET /app/update-check`** — no `Authorization` header, no JWT. This has to work
before a user is signed in (and even before they've opened the app past a splash
screen), so it isn't gated by `authMiddleware` the way most routes are.

Query params:

| param         | required | notes                                                              |
|---------------|----------|---------------------------------------------------------------------|
| `versionCode` | yes      | non-negative integer. Missing or non-integer → `400`.              |
| `platform`    | no       | defaults to `'android'`. Only `'android'` rows exist today.        |

```
GET /app/update-check?platform=android&versionCode=12
```

## 2. Response shapes

No update needed (client's `versionCode` is at or above the latest published row, or
no rows exist yet for the platform):

```json
{ "updateAvailable": false }
```

Update available (there's a row for the platform with a higher `versionCode`):

```json
{
  "updateAvailable": true,
  "latestVersion": "1.4.0",
  "latestVersionCode": 14,
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.taskodoro",
  "releaseNotes": "Bug fixes and performance improvements",
  "forceUpdate": false
}
```

`forceUpdate: true` means this release is mandatory — the backend doesn't enforce
anything itself (there's no block on other endpoints), so if the client wants a hard
gate it has to act on this flag itself (e.g. a non-dismissible dialog instead of a
dismissible banner).

Bad request (missing/invalid `versionCode`):

```json
{ "error": "versionCode is required and must be a non-negative integer" }
```
→ `400`.

## 3. Where `latestVersionCode` comes from

`app_versions` (new table, `Taskodoro-Be/src/db/schema.ts`) — one row per published
release: `platform`, `version` (display string), `versionCode` (integer, compared
directly — this is what drives `updateAvailable`, not `version`), `downloadUrl`,
`releaseNotes`, `forceUpdate`. The endpoint just takes the row with the highest
`versionCode` for the given `platform`.

**There's currently no publish API** — rows are inserted directly in the DB (no admin
auth scheme exists yet to protect a write endpoint). Right now there's exactly one row:
`version: '0.0'`, `versionCode: 0`, `downloadUrl: 'https://mavnt.in'` — a placeholder
floor for the beta, not a real release. Since `versionCode` starts at `1` on a real
Android build (see below), no real client will see `updateAvailable: true` until
someone inserts a row with a higher `versionCode` than whatever's currently shipped.

## 4. Getting the client's own `versionCode`

Android's `versionCode` (`android/app/build.gradle`, currently `1`) is exposed via
`@capacitor/app` (already a dependency) as the `build` field — `version` on that same
call is the display string (`versionName`, currently `"1.0"`), not what this endpoint
compares against:

```ts
import { App } from '@capacitor/app'

const { build } = await App.getInfo() // build is a string, e.g. "1" — Number() it
```

On web, `App.getInfo()` throws/no-ops (no native build to report) — guard the call to
`Capacitor.isNativePlatform()` and skip the check entirely on web, since this is an
Android-distribution concern only.

## 5. API shape (as built)

`lib/api/client.ts`'s `api` object only exported `post` before this — added a `get`
that skips the `Authorization` header and `body` the way `sync.ts`/`auth.ts` use `post`:

```ts
// lib/api/client.ts
get: <T>(path: string) => request<T>(path, { method: 'GET' }),
```

`UpdateCheckResponse` (`types/appVersion.ts`) is a discriminated union on
`updateAvailable` rather than a flat interface with optional fields — a response with
`updateAvailable: false` genuinely carries nothing else, per §2 above.

```ts
// lib/api/appVersion.ts
import { api } from './client'
import type { UpdateCheckResponse } from '../../types/appVersion'

export const appVersionApi = {
  check: (versionCode: number, platform = 'android') =>
    api.get<UpdateCheckResponse>(
      `/app/update-check?platform=${platform}&versionCode=${versionCode}`,
    ),
}
```

## 6. Frontend implementation

**`lib/appUpdate/`** — mirrors `lib/sync/SyncContext.tsx`'s shape (one provider mounted
once in `App.tsx`, exposing a status plus a manual trigger), but simpler: no
retry-on-foreground, since a release only ships every so often.

- `AppUpdateProvider.tsx` calls `appVersionApi.check(...)` exactly **once per app
  launch** — a `useRef` guard inside a mount-only effect, not tied to
  `useAppForeground` (which re-fires on every foreground, the wrong granularity here).
  *(Updated 2026-11-08: it now runs on web too, with the web build's own `versionCode`, and
  on web additionally re-checks when the tab regains focus, at most every 30 minutes — see
  `feat-release-notes-from-be.md`. Native is unchanged, and `status` no longer has a
  `'disabled'` value.)* `checkNow()` is exposed for a manual re-check and is what both the
  auto-check and Settings' chip (below) call.
- `appUpdateContext.ts` / `useAppUpdate.ts` — the context object and consumer hook.
- No "don't show again" persistence *(a background web re-check that finds the same
  release keeps it dismissed)*: a dismissed banner reappears if `checkNow()` runs
  again (app relaunch, or the user taps "Check for Update" in Settings) and the same
  update is still outstanding. Deliberate — see the "Dismiss persistence" decision
  recorded in this doc's history; nothing here depends on `lib/storage/preferences.ts`.
- Failures (offline, backend down) are swallowed for the auto-check, per §5's original
  guidance. The manual Settings chip does surface a `status === 'error'` message,
  since the user explicitly asked for that check and silence would look broken.

**Surfacing an update** — `components/AppUpdateBanner.tsx` (Android; web uses
`WebUpdateBanner.tsx`, and both now show the release notes — see
`feat-release-notes-from-be.md`), rendered from `App.tsx`
itself (alongside `SyncStrategyDialog`, same precedent: an always-mounted component
reading its own context rather than something routed to). `forceUpdate: true` gets a
non-dismissible `Modal` (see below); anything else gets a dismissible bottom pill with
an "Update" link to `downloadUrl` and a close button.

**`components/ui/Modal.tsx` gained a `dismissible` prop** (default `true`, so every
existing caller is unaffected) — `false` drops the close button, the Escape listener and
the backdrop-click handler, and makes the Android back button a no-op (still consumed,
so it doesn't fall through to exiting the app, it just doesn't close the modal). This is
what makes `forceUpdate` actually non-dismissible; `ConfirmDialog` didn't support this
and wasn't the right place to add it (see its own shape — `onConfirm` always closes
afterward), so `AppUpdateBanner` builds its force-update dialog on `Modal` directly.

**Settings** (`pages/PowerToolsPage.tsx`'s `AccountSection`) gets an "App Updates" chip
(`UpdateChip`, next to `SyncChip`) — native-only (hidden entirely on web, not just
disabled), showing the current installed version, the result of the last check, and a
manual trigger. Current version for display comes from `lib/platform/nativeAppInfo.ts`'s
`getNativeAppInfo()`, which wraps `@capacitor/app`'s `App.getInfo()` per §4 — `build` is
what's sent as `versionCode` to the API, `version` (the display string, e.g. `"1.0"`) is
what's shown in Settings. Neither of these read from `package.json`'s `version` field
(an unused Vite-scaffold default, currently `"0.0.0"`) — that's a separate, unrelated
value.

**What still has to happen outside this repo**: the `app_versions` table's only row
today is the beta placeholder (`version: '0.0'`, `versionCode: 0`, §3) — no real client
will ever see `updateAvailable: true` until a new row with a higher `versionCode` than
whatever's currently shipped gets inserted directly in `Taskodoro-Be`'s DB (there's no
publish API yet, per §3). That's a manual step on every real release, not something this
repo can automate.
