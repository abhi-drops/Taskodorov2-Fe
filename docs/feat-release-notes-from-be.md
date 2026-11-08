# Release Notes, "What's New" and Web Update Notice

Status: **backend and frontend implemented** (frontend: 2026-11-08). §§1-3 document the
`Taskodoro-Be` contract as built (migration `0003`, applied locally, not yet promoted to
prod — check with the backend before relying on it in a production build). §§4-9 are the
frontend plan, now built as written except for the decisions under "As built" below. The
backend's own copy is `Taskodoro-Be/docs/feat-release-notes.md`; this file extends
`feat-app-update-check-from-be.md`, which still describes the update-check basics and is
not repeated here.

### As built (where the code settled a plan open point)

- **Markdown:** our own ~100-line renderer in `components/ui/Markdown.tsx`, not
  `react-markdown` (no new dependency, nothing to lazy-load). It builds React elements, so
  raw HTML shows as text; links render only for `http(s):`.
- **Dialog queue** (§6): forced update > `MobileWebNotice` > What's new > feedback prompt.
  `WhatsNewDialog` renders nothing (so records nothing as seen) while either higher one is
  up — `MobileWebNotice` reports through `lib/platform/mobileWebNoticeState.ts`. `FeedbackPrompt`
  waits on `useWhatsNew().pending` (the launch check in flight, or the dialog open).
- **Dismissed web banner:** a background re-check that finds the same release keeps the
  banner dismissed (a manual native check still resets it, as before).
- **Shared dialog:** `components/UpdateNotesModal.tsx` is the notes + action dialog used by
  both `AppUpdateBanner` (Update link) and `WebUpdateBanner` (Reload); `lib/appUpdate/
  updateNotes.ts` picks `notes`, falling back to `releaseNotes`.
- **Web version:** `web-version.json` starts at `{ "version": "0.1 beta", "versionCode": 1 }`
  — make it match `web.versionCode` in the backend's `releases/<version>.md`. Settings'
  hero chip shows `__APP_VERSION__` on web.
- **Not verified:** the Android-only paths (native `getAppInfo()`, the update pill and its
  notes dialog). The web paths were exercised in a browser against a mock backend.

---

## 1. What the backend gives us

One table, `app_versions`: **one row per release per platform** (`android`, `web`).
`release_notes` is now **markdown**. `version_code` is a per-platform integer; a platform may
skip numbers. Notes are authored in the backend repo (`releases/<version>.md`) and published
with `npm run release:publish:*` — nothing in this repo writes them.

## 2. Endpoints (no auth header — usable before sign-in)

### `GET /app/update-check?platform=&versionCode=`

Same as before (`feat-app-update-check-from-be.md` §§1-2), plus one new field when
`updateAvailable` is `true`:

```json
{
  "updateAvailable": true,
  "latestVersion": "1.9.0",
  "latestVersionCode": 802,
  "downloadUrl": "https://…",
  "releaseNotes": "## 1.9\n- **Fixed:** …",
  "notes": [
    { "version": "1.9.0", "versionCode": 802, "notesMd": "## 1.9\n- **Fixed:** …" },
    { "version": "1.8.0", "versionCode": 801, "notesMd": "- **New:** …" }
  ],
  "forceUpdate": true
}
```

- `notes` = every release of that platform **after** the caller's `versionCode`, up to the
  latest, **newest first**, at most **10**. Releases with empty notes are left out, so
  `notes` can be shorter than the number of missed versions, or empty.
- `releaseNotes` is the latest release's notes alone — the old field, kept for already-shipped
  clients. New code reads `notes`, not `releaseNotes`.
- `platform=web` works; the web row's `downloadUrl` is just the site URL.

### `GET /app/release-notes?platform=&since=&upTo=`

For "What's new" after an update. Returns `{ "notes": [ …same shape… ] }`.

| param | required | meaning |
|---|---|---|
| `platform` | no | defaults to `android` — **always send it explicitly** |
| `since` | no | exclusive lower bound, default `0` |
| `upTo` | no | inclusive upper bound — send the installed `versionCode` |

Non-integer or negative `since`/`upTo` → `400 { "error": … }`. It never says whether an update
exists; it is purely "what changed between these two codes".

## 3. Rules the notes are written under (affects rendering)

- Old installed clients show `releaseNotes` as **raw text**, so notes are written to read fine
  unrendered: short `- ` bullets, `**bold**` labels, no tables, no raw HTML.
- The renderer must still handle: headings (`#`–`###`), bullet and numbered lists, `**bold**`,
  `*italic*`, `` `code` ``, links, paragraphs. Anything else may degrade to plain text.

---

## 4. Frontend plan — three surfaces

| # | Surface | Where | Trigger |
|---|---|---|---|
| A | **Update alert with notes** | Android (+ the web equivalent in C) | `update-check` says a newer version exists |
| B | **"What's new" dialog** | Android **and** web | first launch on a version the user hasn't seen |
| C | **Web "new version" banner** | web only | a newer web build was deployed while the tab is open |

### 4.0 Prerequisite: knowing the web build's own `versionCode`

Web has no `App.getInfo()`. Add a repo-root `web-version.json` (`{ "version": "1.4.0",
"versionCode": 7 }`) and bake it into the bundle in `vite.config.ts`:

```ts
define: {
  __APP_VERSION__: JSON.stringify(webVersion.version),
  __APP_VERSION_CODE__: webVersion.versionCode,
}
```

Declare both in `src/vite-env.d.ts`. This is a deliberate **manual bump per web release** (the
same discipline as Android's `versionCode` in `build.gradle`); the value must equal the
`web.versionCode` in the backend's `releases/<version>.md` for that release. `package.json`'s
`version` stays untouched (unused scaffold default, see `feat-app-update-check-from-be.md` §6).

Extend `lib/platform/nativeAppInfo.ts` into a platform-neutral `getAppInfo()` returning
`{ platform: 'android' | 'web', versionCode, versionName }` — native via `App.getInfo()` as
today, web from the baked constants. Keep `getNativeAppInfo()` working for existing callers or
migrate them in the same change.

### 4.A Update alert with notes (Android)

`AppUpdateBanner.tsx` already exists; it currently prints `releaseNotes` as plain text.

- Add `notes` to `UpdateCheckResponse` (`types/appVersion.ts`), typed `ReleaseNote[]`, **required
  in the `updateAvailable: true` branch** but read defensively (`result.notes ?? []`) in case a
  response comes from a backend that predates it.
- **Dismissible pill:** make the label area tappable → opens an "Update available" dialog
  (`Modal`) with the notes list and the **Update** button. The pill's own Update link and ✕ stay.
- **Forced modal:** same notes list inside the existing non-dismissible `Modal`, replacing the
  single `releaseNotes` paragraph.
- Notes list: one block per version, newest first, headed `v{version}`; the first (latest) block
  expanded, older ones collapsed under a "Show earlier versions" toggle when there are more than
  one. If `notes` is empty, fall back to `releaseNotes` rendered the same way, and if that's
  empty too, show no notes section at all.

### 4.B "What's new" dialog (Android + web)

New `lib/whatsNew/` mirroring `lib/appUpdate/`'s shape: `WhatsNewProvider.tsx` (mounted once in
`App.tsx` next to `AppUpdateProvider`), a context, a `useWhatsNew` hook, plus
`components/WhatsNewDialog.tsx` rendered from `App.tsx`.

State: `lastSeenVersionCode` in `lib/storage/preferences.ts` — `loadLastSeenVersionCode()` /
`saveLastSeenVersionCode()` (Capacitor `Preferences`, which is `localStorage` on web), key
`taskodoro.app.lastSeenVersionCode`.

Once per launch (after hydration, **not** gated on sign-in):

```
current = (await getAppInfo()).versionCode
stored  = await loadLastSeenVersionCode()

stored === null        → save(current); done            // fresh install: no changelog flood
current <= stored      → done                           // nothing new (or a downgrade)
current  > stored      → GET /app/release-notes?platform=…&since=stored&upTo=current
                          notes.length > 0 → open dialog; save(current) when it is CLOSED
                          notes.length = 0 → save(current) immediately (nothing worth showing)
fetch fails / offline  → do NOT save; try again next launch
```

Save on **close**, not on open, so a crash/kill while the dialog is up shows it again. Closing
via X, Escape, backdrop and the primary button all count.

**Known one-time gap:** installs that update *to the first build containing this feature* have
no stored value, so they are treated as fresh installs and see no dialog for that one update.
Accepted: there's no way to tell them apart from a true fresh install without a migration
signal, and showing a changelog to every new user is worse.

### 4.C Web "new version" banner

Today `AppUpdateProvider` is native-only (`status` stays `'disabled'` on web). Change it to run
on both platforms, passing `platform` from `getAppInfo()` to `appVersionApi.check(versionCode,
platform)`:

- Check on load, **and** on tab regain-focus (`visibilitychange` → visible), throttled to once
  per **30 minutes**. Native keeps its once-per-launch behaviour.
- On web the result is shown by a different component: a slim banner "A new version of
  Taskodoro is available — **Reload**", with the notes available behind a "What's new" link
  (same notes list as 4.A). **Reload** is `window.location.reload()`; ignore `downloadUrl` on web.
- Never reload for the user. Taskodoro is offline-first with local SQLite writes; an unprompted
  reload could interrupt a save (see `feat-offline-data-layer.md`'s `saveToStore()` note).
- `forceUpdate` on a `web` row: treat as the non-dismissible modal with a Reload button, same as
  Android's, but only if the backend actually ships such a row (not expected).
- `UpdateChip` in Settings stays native-only for the manual check. Optionally add a web
  "Version" line to Settings → About showing `__APP_VERSION__`.

**Gotcha — release order.** If the backend's `web` row goes live *before* the new bundle is
deployed, a user who clicks Reload gets the old bundle and sees the banner again forever. The
backend's publish script is run **last**, after the web deploy (see the checklist in §8).
A CDN-cached `index.html` can cause the same thing for a few minutes after a deploy; harmless,
it self-heals.

### 4.D Settings: browse past notes

Add a "What's new" row to Settings (next to `UpdateChip`, both platforms) that opens the same
dialog with `GET /app/release-notes?platform=…&upTo=<current>` — the latest few releases, newest
first. This gives everyone a way back to the notes after dismissing the one-time dialog, and
works as the manual test hook (§9).

## 5. Markdown rendering

Notes are markdown from our own backend, but treat them as untrusted content anyway.

- **Recommended:** `react-markdown` with **no** `rehype-raw` (raw HTML is dropped by default),
  `components` overrides so output uses the app's type scale (`font-display` headings, the
  `text-slate-700` body, `list-disc`/`list-decimal` with `pl-5`), and links forced to
  `target="_blank" rel="noreferrer"` with only `http(s):` hrefs. Load it with `React.lazy` so
  it is not in the startup bundle — nothing renders notes until one of the dialogs opens.
- **Alternative** if bundle size matters more: a ~40-line renderer for the subset in §3. More
  code to own, no dependency. Decide when implementing; either way keep it behind one
  `components/ui/Markdown.tsx` so it can be swapped.

## 6. Failure and edge behavior

| Case | Behavior |
|---|---|
| Offline / backend down | Update check fails silently (existing behavior); What's new keeps its stored value and retries next launch |
| `notes` empty but update available | Banner/modal still show, just without a notes section |
| Several dialogs due at once (MobileWebNotice, force-update modal, What's new, feedback prompt) | Priority: forced update > everything else. What's new and the feedback prompt must not stack on screen together — queue What's new until the other has closed. Settle the exact queue when implementing; don't let two modals open at once |
| Fresh install | Stores current code, no What's new |
| Downgrade / sideloaded older build | `current <= stored` → nothing shown, stored value left as is |
| Notes are huge | Capped by the backend at 10 versions; dialog body scrolls |

## 7. Files to touch (expected)

- New: `web-version.json`, `lib/whatsNew/*`, `components/WhatsNewDialog.tsx`,
  `components/WebUpdateBanner.tsx`, `components/ui/Markdown.tsx`, `components/ReleaseNotesList.tsx`.
- Changed: `vite.config.ts`, `src/vite-env.d.ts`, `types/appVersion.ts`, `lib/api/appVersion.ts`
  (`check(versionCode, platform)` already takes `platform`; add `releaseNotes.get(...)`),
  `lib/platform/nativeAppInfo.ts`, `lib/appUpdate/AppUpdateProvider.tsx` +
  `appUpdateContext.ts`, `lib/storage/preferences.ts`, `components/AppUpdateBanner.tsx`,
  `App.tsx`, `pages/PowerToolsPage.tsx` (the What's new row).
- Per the repo rules: add a `docs/changelog.md` entry when the code lands, and update this
  file's status line plus `feat-app-update-check-from-be.md` (whose "no persistence", "native
  only" and "once per launch" statements stop being true on web). The Templates AI Guide is not
  affected.

## 8. Release checklist (frontend half)

Full cross-repo order lives in the backend doc; the frontend's part is:

1. Bump `android/app/build.gradle` `versionCode`/`versionName` **and** `web-version.json`.
2. Make sure the backend's `releases/<version>.md` has matching `android.versionCode` and
   `web.versionCode`.
3. `npm run build`, deploy the web bundle, publish the APK.
4. Only then run the backend's `release:publish:prod`.

## 9. Testing

No test runner exists here, so this is manual:

- **Backend:** run `Taskodoro-Be` locally and publish two fake releases with
  `npm run release:publish:local` (then delete the rows).
- **What's new:** web — in DevTools set `taskodoro.app.lastSeenVersionCode` below the current
  code and reload (Capacitor Preferences uses `localStorage`; the key may be prefixed, check
  Application → Local Storage). Android — needs a real build; clear app data for the fresh-install
  case, install over an older build for the upgrade case.
- **Web banner:** run with `__APP_VERSION_CODE__` set lower than the published `web` row.
- **Browser testing can't cover the `isNative` paths** (see `CLAUDE.md`) — the Android update
  alert and the native `getAppInfo()` need a device/emulator.
