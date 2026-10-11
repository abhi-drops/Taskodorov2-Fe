# Feature: Settings (formerly Power Tools)

`/settings` (`PowerToolsPage.tsx`) and `/settings/groups/:id`
(`GroupSettingsPage.tsx`) — the hub for everything that isn't core board/note CRUD:
group management and account. **Renamed from "Power Tools" in Phase 2.7**
(`phase2-apps-diary-plan.md`): the user-facing label and routes changed; internal
file/component names (`PowerToolsPage`, `PowerToolsSidebar`, `PowerToolsTab`) did not.
The old `/power-tools` and `/power-tools/groups/:id` paths redirect (`replace`) to the
new ones in `router/routes.tsx`. The **Addons tab/section was removed** in the same pass
— Pomodoro now lives under Apps (`feat-apps.md`); an old `?tab=addons` link falls back
to the Groups tab. Deliberately kept separate from the
guest-first board so first-time UX stays simple; this is where complexity lives once
someone goes looking for it.

## Layout: mobile vs desktop

Reworked against a mobile mockup (`docs/design-references/mobile/`) and a rough
desktop wireframe — see `docs/style-guide.md`'s "Power Tools: row chips + desktop
2-panel drill-down" section for the full visual system (chip rows, `DANGER_CHIP`,
`GroupIcon`). Structurally the two platforms now genuinely diverge:

- **Mobile** — `/settings` is one scrolling page (Groups → Account, in that order) and
  `/settings/groups/:id` is a separate full-page screen, matching the two distinct
  mobile mockups.
- **Desktop** — a persistent left sidebar (`components/PowerToolsSidebar.tsx`, 2 tabs:
  Groups / Account & Sync, selected via `?tab=` on `/settings`, default `groups`) with a
  right panel whose content depends on the active tab. Opening a
  specific group's settings **is still a real navigation** to
  `/settings/groups/:id` (kept as a separate route on purpose — browser
  back/forward and deep-linking both still work), but visually it reads as the same
  right panel "drilling down" in place — no separate "Back" control, since the
  persistent sidebar's own "Groups" tab (`activeTab="groups"`, rendered by
  `GroupSettingsPage.tsx` too) already is the way back. This is a real `isNative`
  branch in both page files (not a CSS breakpoint) since it's
  an actual navigation-model difference, not just a layout reflow. Both the sidebar
  and the right panel sit on their own `border-neutral-300 bg-surface shadow-card`
  backdrop card (`PowerToolsDesktopLayout` in `components/PowerToolsSidebar.tsx`, a thin
  wrapper over the generic `components/SidebarPanelLayout.tsx` that Apps also uses) —
  the same board-backdrop treatment `GroupColumn`/`TopNav` use, desktop-only.

## Sections

- **Groups** — list of the active workspace's groups, each row: box icon (`GroupIcon`), name, gear
  icon (`SettingsIcon`, → `/settings/groups/:id`, see `feat-groups.md`), close icon
  (`CloseIcon`, → `ConfirmDialog` →
  cascading delete). A "+ New group" input + button chip below the list
  (`common_logics/useGroupForm.ts`) — **this is the only way to create a group** (see
  `feat-groups.md` for why the board itself has no create-group UI).
- **Board** (mobile only) — two settings for the floating "+", both read through
  `common_logics/useAddButtonSettings.ts`:
  - the "Dynamic Add Button" on/off switch chip, which controls its idle shrink, its
    wake on tilt left or down, and its tilt-right tuck;
  - an "Add Button Position" High / Medium / Low picker (`Tabs`, default Medium = 50%
    of screen height).

  See
  `feat-navigation.md` ("Dynamic Add Button"). Not shown on desktop web, which has no
  floating "+". On phone-sized web (the mobile layout in a browser) the section shows,
  but "Dynamic Add Button" is forced off and its switch is disabled with an "Android app
  only" hint: `useAddButtonSettings` returns `dynamic: false` and
  `dynamicAvailable: false` whenever `isNative` is false, without touching the stored
  value. The position picker works as usual.
- **Account** — built before the rest of this page existed (Phase 2.2, as the
  guest-first routing rework's login/signup entry point): shows email + Log out when
  authenticated, Log in/Sign up links otherwise (`useAuth()`, same auth system as
  `feat-auth.md`). Lives under the desktop sidebar's "Account & Sync" tab (mobile:
  still just the "Account" section, unchanged order).
- **Sync with Google** — disabled placeholder chip. Distinct, unspecified feature from
  Google Sign-In auth (unclear target product — Calendar/Tasks/Keep — and sync
  direction), not the same thing as the working Google Sign-In in `feat-auth.md`.
- **Wipe All Notes** (Groups section, under Completed Group; 2026-10-05) — danger chip →
  `ConfirmDialog` → `wipeWorkspaceNotes` (`lib/db/notes.ts`). Soft-deletes every note in
  the **active workspace** in one write. The workspace, its groups and their settings
  stay, and so does the Diary's history, which records it as a single "Wiped" entry
  (`feat-diary.md`). Unlike Reset to Default it needs no reload: the board re-reads its
  notes when it is next opened.
- **Reset to Default** — danger chip → `ConfirmDialog` → `lib/db/reset.ts`'s
  `resetToDefault()` → `window.location.reload()`. Since 2026-10-05 it is a **full
  factory reset**: it erases everything stored on the device and seeds a new app.
  - Database: `DELETE FROM` `notes`, `groups`, `workspaces`, `activity_events` and
    `templates` (real deletes, not the soft-delete cascade), then `seedBuiltinTemplates`
    and `seedIfEmpty`. So the Diary's history and the user's own templates go too, and
    edited built-in templates return to their factory form.
  - Preferences: `Preferences.clear()`, which drops the auth session (the user is signed
    out on this device; nothing is sent to the backend), the active workspace and the
    add-button settings.
  - Browser storage: `localStorage.clear()` and `sessionStorage.clear()` (panel widths,
    the phone-web notice dismissal).
  The confirm dialog spells all of this out. To clear only one workspace's notes and keep
  everything else, use Wipe All Notes above.

## Why nothing here has a Save button

Every field in this app that isn't a create-flow's title (see `feat-notes.md`)
auto-saves the moment it changes — established with Group Settings' selects in Phase
2.4 and carried through everywhere since (Reset to Default/Delete This Group excepted,
which need an explicit destructive confirm, not silent auto-save). No mockup across the
whole app shows a Save button anywhere; this was read as intentional rather than an
omission.
