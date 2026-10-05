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

`createWorkspace(name, templateId?)` auto-switches to the newly created one. With a
`templateId` the workspace starts with that template's groups, settings and sample notes
(`createWorkspaceFromTemplate`, see `feat-templates.md`); without one, or if the template
has been deleted meanwhile, it starts empty. `deleteWorkspace` cascades
(via `lib/db/workspaces.ts`, see `feat-offline-data-layer.md`) and, if the deleted
workspace was active, switches to another remaining one automatically — the app can
never be left pointing at a deleted workspace. There is always ≥1 workspace; the first-
run seed guarantees it and the switcher UI enforces it (see below).

## Switcher UI

`WorkspaceSwitcher.tsx` (`src/components/`) + `useWorkspaceSwitcher.ts`
(`common_logics/`). **No mockup exists for this** — none of the Penpot screens show
more than a static "workspace 1" label — so the layout was worked out inline; the
visual system was reworked later to match the board/Power Tools chip aesthetic (see
`docs/style-guide.md`'s "Power Tools: row chips..." section — this reuses the same
`border-[3px] border-ink bg-white shadow-card` row-chip treatment, not a bespoke
style of its own):

- **Creating a workspace** is a separate dialog, not an input in the list. The list's last
  chip, "New workspace", closes the switcher and opens `NewWorkspaceDialog`
  (`useNewWorkspace.ts`): a name field and a "Start from" grid of template tiles (a
  `TemplateThumb` and the name; the selected tile is `sticky-yellow`). It shows the first
  three templates, with "More templates" expanding the grid in place. Default is
  selected to begin with. "Import template" beside it imports a template file, stores it
  and selects it. The grid's last tile, **Generate with AI** (dashed border, the ChatGPT,
  Claude and Gemini logos from the icon library), swaps the dialog for a four-step
  "Generate with AI" view: download the AI Guide, give it to an assistant, download the
  file it returns, then "Import and create workspace", which stores the file as a new template
  and creates the workspace from it in one step (named with what was typed, or after the
  template). It replaces the dialog instead of stacking a second `Modal`, because every
  open `Modal` closes on Escape. See `feat-templates.md`, "AI Guide". It is a large centred `Modal` on web (`size="large"`: about 60% of the screen wide, 90% tall, big tiles, the grid scrolls and the buttons stay pinned) and a full-page modal on mobile,
  with the same frosted overlay and deep shadow as the switcher. The template editor's
  "Use template" opens the same dialog with its template preselected.
- Trigger: the workspace name + chevron, in the board's header (only there — the
  mockups only ever show the workspace label on the Board screen, never on Search/Power
  Tools/etc., so the trigger isn't in the shared `AppShell` chrome).
- Web: an anchored dropdown (`position: relative`/`absolute`, closes on outside
  click/Escape) whose panel is a `border-neutral-300 bg-surface` backdrop card (same
  board-backdrop treatment as `GroupColumn`/`TopNav`/`PowerToolsDesktopLayout`)
  wrapping the row chips. Mobile: a `Modal` with `variant="full-page"` — same row
  chips inside.
- **Deeper "lifted" feel than the rest of the app, on both platforms**: opening the
  switcher shows a frosted white dim behind it — `SWITCHER_OVERLAY` (`bg-white/60
  backdrop-blur-sm`), deliberately *not* the app's usual dark `Modal` backdrop
  (`bg-black/40`) or the board's opaque grid — plus a bigger offset shadow than the
  standard `shadow-card` token, `SWITCHER_SHADOW` (`shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]`,
  both constants local to `WorkspaceSwitcher.tsx`). Desktop: a separate `fixed inset-0`
  overlay `<div>` rendered alongside the dropdown panel (its own `onClick` closes the
  switcher too, redundant with but consistent with the existing outside-pointerdown
  listener). Mobile: `Modal.tsx` gained optional `overlayClassName`/`panelClassName`
  props (full replacements for its default `bg-black/40`/`shadow-lg`, not appended
  alongside them — see `style-guide.md`) so this one consumer can opt into the same
  look without changing `Modal`'s default appearance anywhere else it's used (note/
  group delete confirmations, auth, etc.).
- **The trigger itself stays sharp above the frost, but only while open** — the
  workspace-name button (name + `ChevronDownIcon`) conditionally gets `z-[60]` (`isOpen` only) so it paints above
  both the desktop overlay (`z-40`) and the mobile `Modal`'s own overlay (hardcoded
  `z-50` in `Modal.tsx`, portalled to `document.body` — a tied `z-50` on the trigger
  would've been decided by DOM/portal order, not something to rely on, hence `z-[60]`
  rather than matching `z-50` exactly). **This must stay conditional on `isOpen`** — an
  earlier version applied `z-[60]` unconditionally, which meant the trigger sat above
  *any* unrelated modal/dialog elsewhere in the app (any platform) even while the
  switcher itself was closed, since z-index still governs stacking against anything
  spatially overlapping it (e.g. a `ConfirmDialog`'s full-screen backdrop) whether or
  not the switcher's own popup is open. Caught and fixed same-session.
- Both render the same list content: click a name to switch to it, a pen icon to
  rename, a close icon (`CloseIcon`) to delete (hidden entirely when only 1 workspace remains, same as
  before).
- **Rename is inline and autosaves, but is a separate explicit action from
  switching** — a first pass made the name itself a directly-editable `<input>`
  (matching `GroupSettingsPage.tsx`'s title field), reasoning that a click on the
  padding around it would still switch workspaces. In practice the input's own
  clickable area covers nearly the whole row, so "click to switch" became almost
  impossible to hit — a real regression, caught immediately by trying to actually use
  it. Fixed by keeping the name a plain button (single click = switch, unambiguous,
  same as before the redesign) and adding a small pen icon (`EditIcon` from
  `components/ui/icons.ts`, the library's Pen 01) that swaps just that row into an autofocused,
  autosave-on-blur/Enter input (`editingId` state, local to the component — Escape
  cancels without saving and reverts to the button). Still zero Save/Cancel buttons in
  the edit state itself (that's the part of the original "inline autosave" idea that
  *did* hold up) — the only thing that changed is what triggers entering edit mode.
- Closing the switcher (outside click, Escape, the trigger chevron, or the mobile
  `Modal`'s own close) also always exits any in-progress rename (`closeAll()`, local to
  the component) so a stray edit row never reopens already in edit mode next time.
- Delete confirmation switched from a bespoke full-content-swap of the open panel to
  the shared `ConfirmDialog` (same component `GroupSettingsPage`/`PowerToolsPage`
  use for their destructive actions) — a second stacked `Modal` on mobile, where the
  switcher itself already *is* one. `ConfirmDialog` itself later adopted this same
  frosted-white overlay/deep-shadow treatment (see below), so on mobile this is now two
  stacked frosted-white overlays rather than one white on top of a dark one — a
  slightly heavier blur/tint where they overlap, not a functional issue, accepted in
  favor of consistency over the old code path being bespoke.
- **`ConfirmDialog.tsx` itself now uses this same overlay/shadow treatment
  everywhere** — not just for workspace delete. Every destructive confirmation in the
  app (note delete, group delete, workspace delete, Reset to Default) goes through
  that one shared component, so they all picked up `bg-white/60 backdrop-blur-sm` +
  the deeper offset shadow automatically once `ConfirmDialog` passed the same
  `overlayClassName`/`panelClassName` to its own `Modal` call — see
  `docs/style-guide.md`'s `ConfirmDialog.tsx` entry.
