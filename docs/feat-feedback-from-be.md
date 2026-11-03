# User Feedback

Status: **implemented on both backend and frontend.** §§1-3 document the
`Taskodoro-Be` contract as built. §4 is the original suggested frontend implementation,
kept as written; §6 documents what the frontend actually does (it differs in a few
places — notably it adds a one-day-after-install prompt). No frontend planning doc
preceded this one; the backend was asked for directly.

---

## 1. Endpoint

**`POST /feedback`** — no `Authorization` header, no JWT. Submissions aren't tied to a
user account; anyone can send feedback whether or not they're signed in.

Request body:

```ts
POST /feedback
{
  rating: number,        // required: 0–5 inclusive, in steps of 0.5 (e.g. 4.5)
  comment?: string,      // optional free text
  platform?: string,     // optional, e.g. 'android' | 'web'
  appVersion?: string,   // optional display version, e.g. '1.4.0'
}
```

`rating` is the only required field. Anything that isn't a multiple of 0.5 between 0
and 5 (e.g. `4.3`, `-1`, `5.5`) is rejected — the check is `Math.round(rating * 2) ===
rating * 2` server-side, so send a plain JS number, not a string.

## 2. Response shapes

Success (`201`):

```json
{
  "feedback": {
    "id": "1cc60f83-a1ba-4013-8caf-ee1a2969ccfd",
    "rating": 4.5,
    "comment": "Great app, love the pomodoro timer!",
    "platform": "android",
    "appVersion": "1.4.0",
    "createdAt": "2026-11-03T06:56:54.554Z"
  }
}
```

`comment`/`platform`/`appVersion` come back `null` if omitted. `rating` round-trips as
a real JS number (not a string) despite being stored as Postgres `numeric` — the
backend's Drizzle column is declared `mode: 'number'`.

Bad request (missing/invalid `rating`), `400`:

```json
{ "error": "rating is required and must be a number" }
```
```json
{ "error": "rating must be between 0 and 5, in increments of 0.5" }
```

**Note on this repo's `lib/api/client.ts`:** `request()` reads `body.message` out of a
failed response to build the thrown `ApiError`. This backend route (like the rest of
`Taskodoro-Be`'s routes) replies with `{ error: "..." }`, not `{ message: "..." }`, so
today that specific string is lost and the caller sees the generic `Request failed
(400)` fallback instead. That's a pre-existing mismatch across every BE route, not
something new here — worth knowing if you want the exact validation message surfaced
in a feedback form's error state, but not blocking: you can validate the rating
client-side before sending (see §4) so the `400` case shouldn't normally happen from
the app's own UI.

## 3. Storage

New `feedback` table (`Taskodoro-Be/src/db/schema.ts`): `id` (uuid, server-generated),
`rating` (`numeric(2,1)`), `comment`, `platform`, `appVersion` (all nullable text),
`createdAt` (server-generated). No `userId` column — submissions are anonymous by
design, nothing to join against. **There's no read endpoint** — rows are meant to be
inspected directly via `drizzle-kit studio` (`npm run db:studio:local` /
`db:studio:prod` in `Taskodoro-Be`), not fetched back into the app.

## 4. Suggested frontend implementation (not yet built)

This section is a starting point, not a spec — adjust freely, nothing here is load-bearing
on the backend.

**API client** — same shape as `lib/api/appVersion.ts`:

```ts
// lib/api/feedback.ts
import { api } from './client'
import type { FeedbackSubmission, FeedbackResponse } from '../../types/feedback'

/** No auth header — anonymous submission, see docs/feat-feedback-from-be.md. */
export const feedbackApi = {
  submit: (body: FeedbackSubmission) => api.post<FeedbackResponse>('/feedback', body),
}
```

```ts
// types/feedback.ts
export interface FeedbackSubmission {
  rating: number
  comment?: string
  platform?: string
  appVersion?: string
}

export interface FeedbackResponse {
  feedback: {
    id: string
    rating: number
    comment: string | null
    platform: string | null
    appVersion: string | null
    createdAt: string
  }
}
```

**Populating `platform`/`appVersion`** — reuse `lib/platform/isNative.ts`'s `isNative()`
and `lib/platform/nativeAppInfo.ts`'s `getNativeAppInfo()` (already built for the
update-check feature, §4 of `feat-app-update-check-from-be.md`): `platform:
isNative() ? 'android' : 'web'`, `appVersion` from `getNativeAppInfo()?.versionName`
on native, left `undefined` on web (there's no meaningful app version to report there).

**UI** — half-star increments mean a plain 1–5 click target isn't enough; a star-rating
control needs to register which half of each star was clicked (or a drag/slide
interaction) and store `0.5` steps. No such control exists in `components/ui/` yet —
this would be new. A simple entry point: a "Rate Taskodoro" chip in
`pages/PowerToolsPage.tsx`'s `AccountSection` (next to `SyncChip`/`UpdateChip`, same
precedent as the update-check feature) opening a `Modal` with the star control, an
optional comment `textarea`, and a submit button that calls `feedbackApi.submit(...)`
and closes on success.

**Client-side validation** — mirror the backend's rule before sending (round the
control's value to the nearest 0.5, clamp to `[0, 5]`) so the `400` case in §2 is
effectively unreachable from this UI, not something the form needs to display.

**Error handling** — given §2's note on `client.ts`, a failed submit will surface as a
generic message unless you special-case it. Simplest: treat any thrown `ApiError` as
"couldn't send feedback, try again" — there's no specific error state worth
distinguishing here (the only failure modes are "network/backend down" and "rating
malformed," and the latter shouldn't happen if the control enforces its own range).

**No local persistence needed** — unlike sync's offline-first model, a feedback
submission is fire-and-forget; no queue, no retry-on-reconnect. If the `POST` fails,
just let the user try again (don't silently drop their comment without telling them,
the way the update-check auto-check swallows errors per its own §6 — that's fine for a
background check, but a user who just typed a comment should know it didn't go through).

## 6. Frontend implementation

**Pieces**

- `types/feedback.ts`, `lib/api/feedback.ts` — as sketched in §4 (`feedbackApi.submit`, no
  auth header).
- `lib/feedback/submitFeedback.ts` — `submitFeedback(rating, comment)`: rounds/clamps the
  rating (`normalizeRating`), trims the comment (omitted if empty), adds `platform`
  (`'android'`/`'web'`) and, on native, `appVersion` (`getNativeAppInfo().versionName`).
  Throws on any failure; the dialog shows one generic "try again" message. On success it
  also sets `dontAskAgain` (below), so feedback sent from Settings stops the prompt too.
- `components/ui/StarRating.tsx` — the half-star control (see `docs/style-guide.md`).
- `components/FeedbackDialog.tsx` — a `Modal` with stars, an optional comment and Send
  (disabled until a rating above 0 is chosen). Two modes:
  - `manual` — opened from Settings → About's "Send Feedback" chip
    (`pages/PowerToolsPage.tsx`). Just Send and the close (X) button.
  - `prompt` — the day-one nudge. Adds a **"Don't ask again"** checkbox and a secondary
    button, **"Remind me later"**, which turns into **"Ok"** once the box is ticked.
    Closing the dialog any other way (X, Escape, backdrop, Android back) does the same
    as that secondary button.
  - After a successful send the dialog shows a "Thank you!" state with a Close button.
    A failed send keeps the form (and the typed comment) and shows an error; nothing is
    queued or retried (§4).
  - Mounted only while open, so every opening starts with a blank form.
- `components/FeedbackPrompt.tsx` — rendered from `App.tsx` (next to `AppUpdateBanner`).
  Decides when to show the `prompt`-mode dialog. Waits while a `forceUpdate` modal is up.

**Local data** (`lib/storage/preferences.ts`, Capacitor Preferences → `localStorage` on web)

| key | value |
|-----|-------|
| `taskodoro.feedback.installedAt` | epoch ms of the install's first launch with this feature, written once by `getOrCreateInstalledAt()` and never changed. A reinstall starts a new clock. |
| `taskodoro.feedback.prompt` | `{ dontAskAgain: boolean, remindAt: number \| null }` |

**When the prompt shows.** On launch and whenever the app returns to the foreground
(`useAppForeground`): not if `dontAskAgain`; otherwise once `now >= (remindAt ??
installedAt + 24h)`.

| action | stored |
|--------|--------|
| Remind me later (or closing with the box unticked) | `remindAt = now + 24h` |
| Ok / closing with the box ticked | `dontAskAgain = true` |
| Send (from either entry point) | `dontAskAgain = true` |

Installs that already existed before this shipped get their `installedAt` on first
launch of the new version, so they're asked a day later, not immediately.
