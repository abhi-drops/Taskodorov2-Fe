# Feature: Workspaces

Multi-workspace create/rename/delete/switch, with one workspace always active. A
workspace is the top-level container — every group and note belongs to exactly one.

## State (`src/lib/workspace/`)

`WorkspaceContext.ts` + `WorkspaceContext.tsx` + `useWorkspace.ts` — mirrors
`src/lib/auth/`'s exact 4-file split (types+context / provider / consumer hook). On
mount, `WorkspaceProvider` loads all workspaces (`lib/db/workspaces.ts`) and the
persisted `activeWorkspaceId` (`lib/storage/preferences.ts`, key
`taskodoro.workspace.activeId` — same small-pointer-value convention already used for
the auth session). If the persisted id no longer matches a loaded workspace (e.g. it
was deleted in another session), falls back to the first workspace.

`createWorkspace` auto-switches to the newly created one. `deleteWorkspace` cascades
(via `lib/db/workspaces.ts`, see `feat-offline-data-layer.md`) and, if the deleted
workspace was active, switches to another remaining one automatically — the app can
never be left pointing at a deleted workspace. There is always ≥1 workspace; the first-
run seed guarantees it and the switcher UI enforces it (see below).

## Switcher UI

`WorkspaceSwitcher.tsx` (`src/components/`) + `useWorkspaceSwitcher.ts`
(`common_logics/`). **No mockup exists for this** — none of the Penpot screens show
more than a static "workspace 1" label — so the design was worked out inline this
session:

- Trigger: the workspace name + chevron, in the board's header (only there — the
  mockups only ever show the workspace label on the Board screen, never on Search/Power
  Tools/etc., so the trigger isn't in the shared `AppShell` chrome).
- Web: an anchored dropdown (`position: relative`/`absolute`, closes on outside
  click/Escape). Mobile: a `Modal` with `variant="bottom-sheet"`.
- Both render the same list content: switch (click name), inline rename, delete
  (hidden entirely when only 1 workspace remains).
- Delete confirmation is a full content-swap of whichever panel is open (not a second
  stacked `Modal`, which would be awkward on mobile where the switcher itself already
  *is* a `Modal`) — shows "Delete '<name>' and everything in it?" with Cancel/Delete,
  then reverts to the list.
