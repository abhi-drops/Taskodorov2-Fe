# Feature: Theming (light / dark)

Added 2026-11-08. The app has a light theme (the original look) and a dark theme taken
from a Penpot dark design: a charcoal canvas with faint light grid lines, `#383838`
panels with a `#c2c2c2` edge, vivid sticky colours, a white title and search icon. New
installs start **Light**; Settings → Appearance offers **System / Light / Dark**.

## How it works

- **Tokens re-pointed under `<html data-theme>`.** Tailwind v4 utilities compile to
  `var(--color-x)`, so `src/index.css` defines the semantic tokens in `@theme static` (light
  values) and overrides them in `:root[data-theme='dark']`. Almost no `dark:` variants are
  needed; the `dark` custom variant exists for the few one-offs (`dark:text-ink`,
  `dark:text-black` on coral, `dark:bg-surface`). The attribute is on `<html>`, not a
  wrapper, so Radix portals (the `Select` menu) are themed too, and `color-scheme: dark`
  themes native controls and scrollbars.
- **Pre-paint script.** `index.html` has an inline script that reads
  `localStorage['taskodoro.theme']` and sets `data-theme` (and the `theme-color` meta)
  before first paint, so a dark-mode user never sees a flash of light. It mirrors
  `lib/theme/themeStorage.ts`; keep the key, the values and the default in sync.
- **`ThemeProvider`** (`lib/theme/ThemeProvider.tsx`, outermost in `App.tsx`, no auth/sync/db
  dependency) owns the state: `useTheme()` (`lib/theme/themeContext.ts`) returns
  `preference` (`system | light | dark`), `resolved` (`light | dark`) and `setPreference`.
  It applies `data-theme`, keeps the `theme-color` meta in step, and re-resolves `system`
  when the OS scheme changes.
- **Storage is synchronous `localStorage`, deliberately not `preferences.ts`** (same
  reasoning as `lib/storage/panelLayout.ts`): Capacitor Preferences is async, so the theme
  would arrive after first paint and flash. It is device-local and never synced
  (`user_state` is not used: it syncs and only holds booleans). `resetToDefault` clears
  `localStorage`, so Reset returns the app to Light.

## Entry points

- **Settings → Appearance** (`AppearanceSection` in `PowerToolsPage.tsx`): a `Tabs` picker
  in a chip. Mobile: a section in the stacked page (nav label "Theme"). Desktop: an
  "Appearance" sidebar tab (`?tab=appearance`).
- **Desktop Home header**: `components/ThemeToggle.tsx` (sun/moon) beside the search icon.
  It flips *resolved* light ↔ dark and stores an explicit choice. Not shown on mobile, where
  the theme lives in Settings.

## Tokens

| Token | Use | Light | Dark |
|---|---|---|---|
| `surface` | canvas, `body`, full-screen spinner/auth pages | `#f4f5f7` | `#28282b` |
| `panel` | backdrop cards on the canvas (TopNav pill, group columns, settings/diary/template panels) | `#f4f5f7` | `#383838` |
| `paper` | dialogs, modals, the filter panel, the tape wash | `#fff` | `#383838` |
| `field` | text inputs (`TextField`, `FIELD_INPUT`, search) | `#fff` | `#2b2b2e` |
| `fg` | text/icons directly on the canvas or panels (headings, labels, titles) | `#3c3c3c` | `#f7f7f7` |
| `body` | secondary text (was `text-slate-600/700`) | slate-600 | `#d0d0d4` |
| `muted` | tertiary text (was `text-slate-500`) | slate-500 | `#9a9aa0` |
| `edge` | thin border of backdrop cards (was `border-neutral-300`) | `#d4d4d4` | `#c2c2c2` at 80% |
| `line` | ink-coloured border of panels and dialogs | `#3c3c3c` | `#c2c2c2` |
| `hairline` | dividers, tracks, subtle fills, thin input borders | slate-200 | `#4a4a4e` |
| `solid` / `on-solid` | a dark fill and its text (nav middle segment, exit toast) | `#3c3c3c` / white | `#f7f7f7` / `#3c3c3c` |
| `grid-line` | `.bg-grid` lines | ink at 12% | white at 7% |
| `shadow-pop` | the lifted dialog/callout shadow | black 25% | black 50% |
| `sticky-*` | note colours (dark override only) | `#fbe05d #ff7c8f #96c3f7 #c0ff91` | `#ffd906 #ff3351 #3e97ff #9eff56` |

## The "light island" rule (read before adding UI)

`ink` (`#3c3c3c`) is text, border *and* fill, so it can't just flip. Instead:

- **Light islands keep their light look in both themes**, exactly as in the Penpot dark
  design: chips (group chip, `Select` trigger, `Tabs`, `CHIP` rows, `BackLink`,
  `SidebarToggle`, `TOOLBAR_BUTTON`s, the calendar day cells, banners/toasts that are white
  pills), note cards, sticky-coloured buttons, and everything inside them. They keep
  `bg-white`, `text-ink`, `border-ink`, `text-slate-*`. `Tabs`' active state therefore stays
  `bg-ink text-white` (a `solid` fill would vanish on the white chip).
- **Surfaces on the canvas use tokens**: backdrop panels (`bg-panel border-edge`), dialogs
  (`bg-paper border-line`), inputs (`bg-field`), and any text/border sitting directly on them
  (`text-fg`, `text-body`, `text-muted`, `border-line`, `border-hairline`).
- Never put `text-ink` / `text-slate-*` directly on a panel or the canvas: it is unreadable
  in dark. Never put `text-fg` on a white island: it is light text on white in dark.
- Coral fills with `text-ink` get `dark:text-black` (the vivid dark coral needs the extra
  contrast).
- Baked-ink bitmaps: `search.png` is ink-coloured, so it carries `theme-invert` (white in
  dark). `check-circle.png` / `check-tick.png` only appear on note cards (light islands), so
  they are left alone.

## Known gaps

- **Android**: status-bar icon colour is not themed (needs the `@capacitor/status-bar`
  plugin, not installed); the splash screen is white (needs `values-night` /
  `drawable-night`); the WebView `localStorage` persistence of the theme is untested on a
  device. None of these can be checked in a browser.
- The Google sign-in widget (`GoogleSignInButton`, login/signup cards) switches to
  `filled_black` in dark; the one in Settings' Sync card sits in a white chip and is left as is.

## Templates AI Guide

Not affected: note colours are still stored as names (`yellow | coral | blue | green`) and
the template file format is unchanged; only the colours those names render as differ per
theme.
