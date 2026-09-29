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

`DiaryPage.tsx` is currently a placeholder: a "Diary" header and a "coming soon" panel.
Phase 2.8 replaces the body with the calendar and day scrubber described in
`phase2-apps-diary-plan.md`.
