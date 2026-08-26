# Feature: Power Tools

`/power-tools` (`PowerToolsPage.tsx`) — the hub for everything that isn't core
board/note CRUD: group management, account, and placeholder addons. Deliberately kept
separate from the guest-first board so first-time UX stays simple; this is where
complexity lives once someone goes looking for it.

## Sections

- **Addon Tools** — "Pomodoro", rendered as a disabled `Button`. Not built in Phase 2;
  present-but-inert so the surface area is visible without implying it works.
- **Groups** — list of the active workspace's groups, each row: name, gear icon
  (→ `/power-tools/groups/:id`, see `feat-groups.md`), "×" (→ `ConfirmDialog` → cascading
  delete). "+ NEW GROUP" input + button below the list
  (`common_logics/useGroupForm.ts`) — **this is the only way to create a group** (see
  `feat-groups.md` for why the board itself has no create-group UI).
- **Account** — built before the rest of this page existed (Phase 2.2, as the
  guest-first routing rework's login/signup entry point): shows email + Log out when
  authenticated, Log in/Sign up links otherwise (`useAuth()`, same auth system as
  `feat-auth.md`).
- **Sync with Google** — disabled `Button` placeholder. Distinct, unspecified feature
  from Google Sign-In auth (unclear target product — Calendar/Tasks/Keep — and sync
  direction), not the same thing as the working Google Sign-In in `feat-auth.md`.
- **Reset to Default** — `danger` `Button` → `ConfirmDialog` → `lib/db/reset.ts`'s
  `resetToDefault()` → `window.location.reload()`. Scope decided during
  implementation (no mockup/doc specified it precisely): since there's no separate
  "Power Tools settings" object anywhere in this app, the only meaningful reset is
  wiping every workspace/group/note back to the first-run seed state. Uses the same
  soft-delete cascade as every other delete in the app, then re-seeds — see
  `feat-offline-data-layer.md`.

## Why nothing here has a Save button

Every field in this app that isn't a create-flow's title (see `feat-notes.md`)
auto-saves the moment it changes — established with Group Settings' selects in Phase
2.4 and carried through everywhere since (Reset to Default excepted, which needs an
explicit destructive confirm, not silent auto-save). No mockup across the whole app
shows a Save button anywhere; this was read as intentional rather than an omission.
