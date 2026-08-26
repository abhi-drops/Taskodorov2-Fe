# Feature: Design System

Fonts, the grid background, and the shared `components/ui/*` primitives every screen is
built from. Established in Phase 2.0; nothing here changed since.

## Fonts

Self-hosted via npm (`@fontsource/geomini`, `@fontsource-variable/google-sans-flex`),
imported once in `src/main.tsx`. **Not** a Google Fonts CDN `<link>` — this is an
offline-first app that must work on first launch with no network, so a runtime
dependency on `fonts.googleapis.com` would be wrong.

- `--font-display` (Geomini) — page/section headings.
- `--font-sans` (Google Sans Flex Variable) — body text and general UI, applied as the
  default via `body { @apply font-sans }` in `src/index.css`.

Both are Tailwind v4 `@theme` tokens, auto-generating `font-display`/`font-sans`
utility classes (same mechanism that turns `--radius-card` into `rounded-card`).

## Grid background

`src/assets/background.jpeg` (a grid-paper texture) applied via a `.bg-grid` utility
class in `src/index.css` — `background-size: cover` (not tiled; the source file has no
clean seamless-tile crop available, cover-fill reads the same). Used on board-type
screens only (`AppShell`), never globally on `body` — auth screens stay flat
`bg-surface`.

## Icons

No icon library. `src/assets/` holds a curated set of flat single-color PNGs
(`home.png`, `pluse.png`, `power-tools.png`, `search.png`, `check-circle.png`,
`check-tick.png`, `delete.png`) rendered through `components/ui/Icon.tsx` (a thin
`<img>` wrapper). A few icons are synthesized from these instead of adding new assets:
`Modal`'s close "×" is `pluse.png` rotated 45°; `BottomNav`'s "+" is `pluse.png` with a
`brightness(0) invert(1)` CSS filter to render white-on-purple. One-off glyphs that
don't fit the PNG set (`Select`'s dropdown chevron, `WorkspaceSwitcher`'s trigger
chevron, `PowerToolsPage`'s gear) are small inline SVGs or Unicode characters instead
of pulling in an icon library for a single glyph.

## Shared primitives (`src/components/ui/`)

All follow the same shape: extend the matching native HTML element's attributes
interface, accept an optional `className` for override, `rounded-card` everywhere (the
only radius value used anywhere in the app).

| Component | Purpose |
|---|---|
| `Button.tsx` | `primary`/`secondary`/`ghost`/`danger` variants. `danger` (coral) was added in 2.4 once destructive actions crossed 3 call sites. |
| `TextField.tsx`, `Select.tsx` | Labeled form inputs, label-above-control shape. |
| `Modal.tsx` | `variant: 'center' \| 'bottom-sheet'`. Portal-rendered, closes on Escape/backdrop click. |
| `ConfirmDialog.tsx` | Wraps `Modal` — message + Cancel/danger-confirm button pair. Added in 2.4 once destructive confirmations (group delete, note delete, Reset to Default) crossed 3 uses. |
| `CheckCircle.tsx` | The note-complete toggle affordance — composites `check-circle.png` (ring, always shown) + `check-tick.png` (overlaid when checked). |
| `Tabs.tsx` | Single-select segmented control (Todo/In Progress/Completed style, also reused for the board's group tabs and search's group-scope tabs). |
| `SwatchPicker.tsx` | Single-select 4-color note-color picker. Colors/classes live in `swatchColors.ts` (split out from `SwatchPicker.tsx` itself — the component and the constants can't share a file without breaking React Fast Refresh, which requires component-only files). |
| `ProgressBar.tsx` | Simple track + fill, optional `%` label. |
| `TopNav.tsx` (web) / `BottomNav.tsx` (mobile) | Home/Power Tools (web, 2 items) vs Home/+/Power Tools (mobile, 3 items) — deliberately not matched 1:1, since the mockups themselves differ here. |
| `Icon.tsx` | Thin `<img>` wrapper used by everything above. |

`AppShell.tsx` (`src/components/`, not `components/ui/` — it's a layout composite, not
a dumb primitive) wraps page content with `.bg-grid` + `TopNav`/`BottomNav` based on
`usePlatform().isNative`. Every page routes through it.

## Platform detection

Always `Capacitor.isNativePlatform()`, wrapped in `lib/platform/usePlatform.ts` — never
a viewport-width breakpoint. Verified the hard way: a resized/narrow browser window
still renders the *web* layout (columns, `TopNav`), not the mobile one (tabs,
`BottomNav`) — that's correct, intentional behavior per this rule, not a bug, and it's
the reason this project's browser-based testing could never actually exercise the
native-only UI paths (confirmed separately on a real Android device — see
`feat-offline-data-layer.md`).
