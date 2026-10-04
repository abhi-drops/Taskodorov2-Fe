# Feature: Apps

`/apps` (`AppsPage.tsx`) and `/apps/diary` (`DiaryPage.tsx`) are where optional tools
that sit on top of the board live: Diary, and later Pomodoro. This area was added in
Phase 2.7 (`phase2-apps-diary-plan.md`) as the home for Diary (2.8). It is one of the
three top-level nav items: Home / Settings / Apps.

## Registry

`components/appsList.ts` exports `APPS`, the single list of apps. Each entry has `id`,
`label`, an optional `to`, an `icon`, and `disabled`. The desktop sidebar and the mobile
tile list both read from it, so adding an app means adding one entry here plus a route.
The list lives in a `.ts` file, separate from the components, so React Fast Refresh keeps
working (the same reason as `swatchColors.ts`).

Pomodoro is `disabled: true`: it is shown greyed out and has no link. This is the same
"visible but inert" convention the old Power Tools Addons chip used.

## Layout: mobile vs desktop

This follows the same split Settings uses (see `feat-power-tools.md`):

- **Desktop:**
  - `AppsDesktopLayout` (`components/AppsSidebar.tsx`) is a thin wrapper around
    `components/SidebarPanelLayout.tsx`, the generic 2-panel shell that is also behind
    `PowerToolsDesktopLayout`.
  - `/apps` has no landing content of its own. It redirects (`replace`) to the first
    enabled app, currently `/apps/diary`, which matches the wireframe where Diary is
    selected on arrival.
  - Diary puts `WorkspaceSwitcher` and search into `AppShell`'s header slots, as the
    wireframe shows. This is because Diary is workspace-scoped.
- **Mobile:**
  - `/apps` shows a heading and a list of row chips (`CHIP` from `SidebarPanelLayout`).
    Tapping a chip push-navigates to the app's page.
  - There is no persistent sidebar, and the Android back button walks history as usual.

## Diary

Built in Phase 2.8 (2026-10-03):
- `/apps/diary` is a month calendar of activity.
- `/apps/diary/:date` opens one day: a smooth board replay with a scrubber on desktop,
  and a summary of the day's changes on mobile.

On desktop, the Apps list rail is a `SidePanel` (opt-in `sidePanel` prop on
`SidebarPanelLayout`; Settings' rail stays fixed). It can be resized by dragging its
edge, and it is hidden or shown by a menu-icon `SidebarToggle` placed in the app's own toolbar
(the Diary header's far left). The toggle and the panel share state by the key
`APPS_PANEL_KEY` (`appsList.ts`). A new app that uses this layout should put the same
toggle in its toolbar.

**Collapsed, the Apps list becomes a slim icon rail** (`SidePanel`'s `rail` prop,
built in `SidebarPanelLayout`) rather than disappearing:
- one icon per app, so you can still switch apps;
- the active app in the same ink-bordered white chip it has in the full list;
- disabled apps dimmed;
- tooltips and accessible names on each icon;
- items without an icon show their first letter;
- the rail stretches to the active app's panel height, so they line up.

Both use the shared `DiaryShell`. Desktop renders inside `AppsDesktopLayout`, which
gained a `wide` prop for the day view's replay board. Both routes are lazy-loaded. Full
detail: `feat-diary.md`.
