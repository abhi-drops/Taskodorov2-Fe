# Backend contract: onboarding flags in `POST /sync`

For `Taskodoro-Be` (not in this repo). Extends the existing `/sync` contract
(`phase3-sync-plan-from-be.md`) with a small per-account key/value set so a user's
onboarding progress (which tours they have seen, which tips shown) follows their Google
account to another device. The frontend side is described in `feat-onboarding.md`.

The implementation guide for the backend repo is `docs/feat-onboarding-sync.md` in
`Taskodoro-Be`; this file is the frontend's copy of the wire contract.

**Ship order: deploy the backend first, then release the frontend.** The backend's
`parseBody` reads only the keys it knows and ignores the rest, so an older server does
**not** reject a `userState` array: it accepts the request, stores nothing, and returns no
`userState`. The frontend treats an accepted push as acknowledged and clears the rows'
`dirty` flag, so flags set against an old server are **silently dropped and never retried**,
even after the backend is deployed later. Nothing errors, so it would not be noticed. (The
frontend does tolerate a response without `userState` on the pull side.)

## Wire shape

`changes` gains an optional `userState` array, in the request and in the response:

```ts
type UserStateRow = {
  key: string        // e.g. 'intro.seen', 'boardTour.seen', 'tour.diary', 'tip.sync'
  value: boolean
  updatedAt: number  // epoch ms, set by the client when the flag was written
}

changes: {
  workspaces, groups, notes, templates, activityEvents,   // unchanged
  userState?: UserStateRow[],
}
```

## Rules

- **Scope.** Per account, like templates: no workspace ownership check applies, just the
  authenticated user id. Primary key is `(userId, key)`.
- **Merge.** Last-write-wins per key by `updatedAt`: an incoming row replaces the stored one
  only if its `updatedAt` is greater than or equal to the stored `updatedAt`. Flags are
  booleans, and "Replay Intro" / "Reset Tips" deliberately write `false` with a new
  timestamp, which must win.
- **Response.** Return every row, across all devices, changed after the cursor that was
  sent (including the rows pushed in this same request, as with the other tables). **Always**
  include `userState` in the response, as an empty array when nothing is newer. That is what
  lets the frontend tell a server that handles flags from an older one that ignores them (a
  push that carried flags, answered with no `userState` field), so it can keep those rows
  dirty instead of clearing them. That detection is not built in the frontend yet.
- **Deletes.** None. A flag is never removed, only set to `false`.
- **Validation.** Structural only, like the rest: `key` is a non-empty string (suggest a
  max length of 64 and `[A-Za-z0-9._-]` only), `value` a boolean, `updatedAt` a number.
  Reject the whole request on a structural failure, as elsewhere.
- **Cap.** At most 200 rows per request (the frontend has under 30 keys). Same
  "whole request rejected" behaviour as the 2000-row cap.
- **Cursor.** Rows take part in the same opaque cursor as every other entity.
- **First-sync conflict (409).** Unaffected: `userState` is not part of the "account already
  has data" check, so an account holding only flags does not trigger it. With
  `strategy: 'use_account'` the client does not wipe its flags (they are device-level), and
  last-write-wins reconciles them.

## Storage suggestion

One table `user_state (user_id, key, value boolean, updated_at bigint, cursor_seq ...)` with
the same change-tracking column the other tables use for the cursor.
