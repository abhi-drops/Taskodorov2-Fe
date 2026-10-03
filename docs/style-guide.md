# Feature: Design System

Fonts, the grid background, and the shared `components/ui/*` primitives every screen is
built from. Established in Phase 2.0; the board/note-card visual system (colors, borders,
shadows, the group column layout) was reworked in 2.7 against a Penpot reference export —
see "Board & note-card system" below for what changed and why.

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
`Modal`'s close "×" is `pluse.png` rotated 45°; `GroupColumn`'s add-note "+" is `pluse.png` with a
`brightness(0) invert(1)` CSS filter to render white-on-purple. (`FloatingAddButton`'s
"+" is a text glyph instead, matching the export.) One-off glyphs that
don't fit the PNG set (`Select`'s dropdown chevron, `WorkspaceSwitcher`'s trigger
chevron, `PowerToolsPage`'s box icon) are small inline SVGs or Unicode
characters instead of pulling in an icon library for a single glyph. Glyphs shared
across files — the nav's Apps grid and Settings gear, and the Apps sidebar's Diary book
and Pomodoro clock — live together in `components/ui/NavIcons.tsx` (`currentColor`
stroke, tinted via `text-*`). `power-tools.png` is no longer referenced since the 2.7
Settings rename.

## Board & note-card system

Reworked in 2.7 to match a Penpot design export (`docs/design-references/`) pixel-for-pixel
instead of the earlier generic Tailwind-defaults look. The 4 `--color-sticky-*` note colors
were also repointed to the exact hex values from that export (yellow `#fbe05d`, coral
`#ff7c8f`, blue `#96c3f7`, green `#c0ff91`) — treat the Penpot export as the source of truth
if these ever look like they've drifted. Two more tokens drive the rest of the board's look,
both in `src/index.css`'s `@theme` block:

- `--color-ink: #3c3c3c` — the dark border/label color for the neo-brutalist chrome (chips,
  the add-note button, checkbox rings, the counter control). **Not** the same token as
  `--color-nav-dark` (`#1e1e2a`) — `nav-dark` is reserved for `TopNav`/`BottomNav` chrome and
  is deliberately not matched 1:1 to the mockups (see Platform detection section below);
  `ink` is the new, separate token for the board's border/shadow system.
- `--shadow-card: 1px 3px 0px 0px rgba(0,0,0,0.2)` — a crisp, hard-edged offset shadow (no
  blur), replacing `shadow-lg` on note cards, the group chip, the add-note button, the
  TopNav/group backdrop cards, and (since the Power Tools redesign, see below)
  `PowerToolsPage`/`GroupSettingsPage`'s row chips and danger buttons. **`shadow-lg` is
  still used** on `Modal.tsx`, `AuthCard.tsx`, and `SearchPage`'s white panels — not an
  oversight, an unfinished migration. Treat any remaining `shadow-lg` usage as a
  candidate for the same migration rather than an intentional permanent split.

`--radius-card` is now `0px` (was `1rem`) — square corners everywhere, still the *same*
single radius token (`rounded-card`) the rest of the app uses, just repointed to 0. Don't
introduce a second radius token for the board; reuse `rounded-card`.

Two border colors, two purposes — don't mix them up:
- `border-ink` (`border-[3px] border-ink` on chips/buttons, `border-2 border-ink` on the
  counter control) — thick, dark, used on interactive/decorative chrome sitting *on top of*
  a colored card.
- `border-neutral-300` (thin, 1px) — used only on the light backdrop cards behind a group's
  notes and behind the TopNav pill. Tailwind's `neutral-*` scale was picked over `slate-*`
  deliberately: the reference's `#c1c2c2` border is true neutral gray with no blue tint,
  which `neutral-300` matches and `slate-300` doesn't.

Note-card text is `text-black` (pure black, matches the reference exactly), **not**
`text-nav-dark` — that's reserved for chip/button labels (`text-ink`) and nav chrome.

### Group column: backdrop card + overlapping chip

`src/components/GroupColumn.tsx` (not `components/ui/` — see below) renders each board
column as two visually-overlapping layers, matching the Penpot reference exactly:

1. The header row (chip + square add-note button) is `relative z-10`.
2. Directly below it, a backdrop card (`border border-neutral-300 bg-surface p-4 shadow-card`)
   wraps the note list (and the `No notes yet.` empty state — the backdrop always renders,
   even for empty groups). It's pulled *up* under the header with a negative margin
   (`-mt-7 -ml-4` currently) so the header visually pokes out above/left of the backdrop's
   top edge instead of sitting flush inside it.

**This is intentional, not a layout bug.** If you're touching this file and the negative
margin looks like it's "fighting" the header, don't remove it — that overlap is the actual
design (verified against the Penpot export's raw coordinates: the chip's own box starts
above the backdrop's top edge by design). Re-tune the exact `-mt-*`/`-ml-*`/`pt-*` values by
eye against a reference screenshot if the overlap proportion needs adjusting, don't delete it.

### List notes: two-piece "notch" shape, not one card

`ListNoteCard.tsx` is **not** a single padded `<div>` like `BasicNoteCard`/`CounterNoteCard`.
It's two separate same-color rectangles stacked with zero gap: a full-width title strip, then
a checklist body indented `ml-4` from the left — each with its own `shadow-card`. Stacked
flush, same color, this reads as one shape with a step/notch cut into the left edge (matching
the reference exactly, including a subtle shadow sliver visible at the notch corner, which
comes for free from the two independent shadows). Don't collapse this back into one div —
the notch is the point.

### Power Tools: row chips + desktop 2-panel drill-down

`PowerToolsPage.tsx`/`GroupSettingsPage.tsx` were reworked against a mobile mockup
(`docs/design-references/mobile/`) and a rough desktop wireframe to move off the
original generic white-card-with-`shadow-lg` look onto the same chip system as the
board: every row (a group, Pomodoro, Sync With Google, the "+ New group" input, Reset
to Default / Delete This Group) is its own `border-[3px] border-ink shadow-card` chip
(`bg-white`, `rounded-card`) stacked with gaps under a plain small-text section
heading — not one big enclosing card containing a mini-list, matching the mockup's
"list of independent chips" reading exactly like `GroupColumn`'s note list. Danger
actions (Reset to Default, Delete This Group) are the same chip shape with
`bg-sticky-coral text-white` instead of the shared `Button.tsx` `danger` variant (which
has no border) — a page-local `DANGER_CHIP` class string in each file, not a change to
`Button.tsx` itself, since that primitive is used well beyond this page's aesthetic.
`BoxIcon` (each group row) is a small inline SVG local to `PowerToolsPage.tsx`,
following the same one-off-glyph convention as the chevron icons above rather than
adding new PNG assets. (Since the 2.7 rename to **Settings**, the Addons/Pomodoro chip
moved to Apps — see `feat-apps.md`.)

**Mobile is unchanged in structure** — still the single scrolling page (Groups →
Account) and the separate full-page Group Settings screen, just reskinned;
this matches the two distinct mobile mockups exactly.

**Desktop gained a real structural change**: a persistent left sidebar
(`components/PowerToolsSidebar.tsx`, 2 tabs — Groups/Account & Sync, via `?tab=` on
`/settings`) with a right panel that swaps content
depending on the selected tab, and — when a specific group is opened — "drills down"
into that group's settings in the same right-panel position, mimicking a single
2-panel app even though `/settings` and `/settings/groups/:id` are still two real
routes underneath (kept as separate routes deliberately, so browser back/forward and
deep-linking still work — see `docs/feat-power-tools.md`). No explicit "Back" control
in the detail view — the persistent sidebar's own "Groups" tab
(`<PowerToolsDesktopLayout activeTab="groups">`, rendered by both pages) is the way back,
so a separate back link would be redundant.

Desktop-only, both panels sit on their own backdrop card —
`components/SidebarPanelLayout.tsx` (generic since 2.7: `items`/`activeId`, disabled
items render as dimmed non-links; also exports the shared `CHIP` class) wraps the
sidebar and the right-panel content each in `border-neutral-300 bg-surface shadow-card`, the same
"light panel behind the content" treatment `GroupColumn`'s note-list backdrop and
`TopNav`'s pill backdrop use on the board — rather than floating the row chips/sidebar
tabs directly on `.bg-grid` the way earlier revisions of this page did. `PowerToolsPage`
and `GroupSettingsPage` both render through `PowerToolsDesktopLayout` (and Apps'
`DiaryPage` through `AppsDesktopLayout` — both thin wrappers over `SidebarPanelLayout`) on desktop
(mobile skips it entirely, going straight to `AppShell`'s plain `.bg-grid` content
area) — same as `GroupColumn`'s backdrop, this is `bg-surface`, not `bg-white`; don't
swap it for pure white, that's a different (and here, wrong) token.
This is a genuine `isNative` branch, not a CSS breakpoint (unlike `NoteEditorPage`'s
`lg:` grid) — the sidebar+drill-down is a real interaction/navigation-model
difference from mobile's flat page stack, not just a layout reflow at the same width.

### TopNav backdrop

`TopNav.tsx` wraps its two-pill `<nav>` in a `border border-neutral-300 bg-surface p-2.5
shadow-card` backdrop, matching the group column's backdrop treatment. Unlike the group
chip, the nav pill sits fully *inside* this backdrop — no overlap effect here, just a padded
card.

### `AppShell`'s `headerStart`/`headerEnd` slots

`AppShell` takes optional `headerStart`/`headerEnd` `ReactNode` props, rendered either side of
`TopNav` in the same row (each wrapped in a `flex-1` div, so `TopNav` stays centered whether
or not the slots are used — every page except `HomePage` leaves them empty and gets the exact
same centered-nav row as before). `HomePage` is the only current consumer: it feeds
`WorkspaceSwitcher` (left) and the search icon link (right) into these slots on web, merging
what used to be two stacked header rows into one — but **only when `!isNative`**. On native,
`AppShell` doesn't render a top bar at all (there's `BottomNav` instead), so `HomePage` still
renders its own `WorkspaceSwitcher` + search row inline as page content for that platform,
unchanged from before. If you add a new page that needs left/right header content on web,
reuse this prop pair rather than inventing a page-local header row.

### Motion

Page transitions follow the same rules as the static design: **square edges, hard
edges, hard offset shadows, no blur, no overshoot.**

- A page entering on mobile is a paper "sheet" with a 3px `ink` edge plus the card
  shadow.
- Opening a note morphs the card itself into the editor's note card, so the motion is
  built from the board's own shapes and colours rather than a new visual element.
- Durations stay short (200–320 ms, ease-out) so motion feels polished but never slows
  down everyday use.
- Soft or round effects (feathered masks, blur, springy overshoot on page changes) were
  tried and rejected as off-style. The springy overshoot is still fine on small
  elements like the floating "+".

Full system: `feat-navigation.md` ("Page transitions").

## Shared primitives (`src/components/ui/`)

All follow the same shape: extend the matching native HTML element's attributes
interface, accept an optional `className` for override, `rounded-card` everywhere (the
only radius token used anywhere in the app — currently `0px`, see "Board & note-card
system" above).

| Component | Purpose |
|---|---|
| `Button.tsx` | `primary`/`secondary`/`ghost`/`danger` variants. `danger` (coral) was added in 2.4 once destructive actions crossed 3 call sites. |
| `TextField.tsx`, `Select.tsx` | Labeled form inputs, label-above-control shape. |
| `Modal.tsx` | `variant: 'center' \| 'bottom-sheet'`. Portal-rendered, closes on Escape/backdrop click. Default overlay/panel are still `bg-black/40`/`shadow-lg`, not migrated to `shadow-card`. Optional `overlayClassName`/`panelClassName` fully *replace* (not append to) those defaults when passed, since two same-specificity Tailwind utilities for the same CSS property have no guaranteed winner by JSX class-string order; `WorkspaceSwitcher`'s mobile bottom-sheet and `ConfirmDialog.tsx` (see below) are the two consumers using them, both opting into the same frosted-white-dim + deeper-shadow look. |
| `ConfirmDialog.tsx` | Wraps `Modal` — message + Cancel/danger-confirm button pair. Added in 2.4 once destructive confirmations (group delete, note delete, Reset to Default) crossed 3 uses. Uses `Modal`'s `overlayClassName`/`panelClassName` for the same frosted-white-dim + deeper-offset-shadow look `WorkspaceSwitcher` introduced — every confirm dialog in the app (notes, groups, workspaces, Reset to Default) gets it automatically, since they all go through this one component. |
| `CheckCircle.tsx` | The note-complete/list-item toggle. Composites `check-circle.png` (ring, always shown) + `check-tick.png` (overlaid when checked) — **not** two same-size icons: the tick is deliberately oversized (`size * 1.4`) and offset with proportional inline styles (`marginLeft`, tick `left`/`top` all computed as a fraction of `size`, not fixed px/rem) so the same "bold stamp" look holds at every call-site size (18 in list items, 20-22 elsewhere) instead of only looking right at whichever size it was last eyeballed against. Also carries `max-w-none` on the tick `<img>` — **required**, not decorative: Tailwind's preflight sets `img { max-width: 100% }`, and since the tick is absolutely positioned inside the small `size`×`size` button (its containing block for percentage resolution), `max-width: 100%` silently resolves to the *button's* small size and clamps the oversized tick's width back down — height isn't affected (no `max-height` rule), so the symptom is a squashed/stretched icon, not a missing one. Any future absolutely-positioned icon that needs to render larger than its positioned-ancestor box will hit this exact clamp; add `max-w-none` again if so. |
| `Tabs.tsx` | Single-select segmented control (Todo/In Progress/Completed style, also reused for the board's group tabs and search's group-scope tabs). |
| `SwatchPicker.tsx` | Single-select 4-color note-color picker. Colors/classes live in `swatchColors.ts` (split out from `SwatchPicker.tsx` itself — the component and the constants can't share a file without breaking React Fast Refresh, which requires component-only files). Disabled state (`noteColorMode !== 'manual'`, i.e. `priority` mode) is `pointer-events-none opacity-35` — dimmed to visually read as non-interactive, unlike most disabled controls in this app which only block interaction. In the note editor, a `priority`-mode note also shows a bordered/tinted callout ("Color is set by priority for this group.") directly under the picker, styled `rounded-card border-2 border-ink` with its background tinted to the note's own resolved color (`SWATCH_TINT_CLASSES[displayColor]` in `swatchColors.ts` — each swatch color at 15% opacity, e.g. `bg-sticky-yellow/15`) rather than a fixed accent color, so the callout visually matches whichever priority color is currently active. `swatchColors.ts` also exports `SWATCH_TEXT_CLASSES` (`text-sticky-*`, added for `NoteStatusStrip`/the note editor's Status block — swatch-colored *text* on a dark background, rather than a swatch-colored background) and `SWATCH_PLACEHOLDER_TEXT_CLASSES` (the `placeholder:text-sticky-*/60` counterpart, kept as its own map of complete literal class strings rather than built by concatenating a `placeholder:` prefix onto `SWATCH_TEXT_CLASSES` at the call site — Tailwind's content scanner needs a class's full string to appear literally somewhere in scanned source to generate its CSS, which a runtime-only template-literal concatenation wouldn't satisfy). |
| `Calendar.tsx` | Generic month grid on react-day-picker v9. Its stylesheet is **not** imported: square `rounded-card` cells with `border-2 border-ink` and `shadow-card`, today in `sticky-yellow`, outside days at 40%. The header is our own yellow square ‹ › buttons and the month name (from the Diary wireframe). Callers render per-day content with `renderDay`, passed to the module-level day button through context so cells don't remount every render. First used by the Diary (`feat-diary.md`). |
| `Scrubber.tsx` | Generic frame slider on Radix Slider: an ink track, a **round** yellow thumb (round on purpose, matching the wireframe, the one round control in the app), a tick per frame (hidden above 120), and a square Play/Pause button. Accessible, with arrow keys and touch drag. Takes `frameCount`/`frame`/`onChange`; no Diary logic. |
| `SidePanel.tsx` | Desktop sidebar that is collapsible, drag-resizable and capped to the screen height.<br>• It has **no toggle of its own**: a `SidebarToggle` in the page's toolbar opens and closes it. They share state by `storageKey` through a tiny store in `lib/storage/panelLayout.ts` (`useSyncExternalStore`).<br>• **Collapsing removes it entirely**: the width animates to exactly 0 with no padding sliver, and the gap beside it, which the panel owns as `gap` margin, closes too. Parents put no flex gap next to it. (An earlier version left a thin border line and an empty gap behind it.)<br>• Optional **`rail`**: instead of disappearing, a collapsed panel shows this slim strip (`railWidth`, default 52px) with a half gap. The strip `self-stretch`es to the height of the content beside it. The Apps list uses it for an icon rail; the Diary's day details doesn't.<br>• Drag the inner edge to resize: it is an accessible `separator`, ←/→ steps 16px and double-click resets.<br>• Width and collapsed state are remembered per `storageKey` (`lib/storage/panelLayout.ts`, synchronous `localStorage` so there's no jump on load).<br>• `sticky` with a `maxHeight` cap and its own scrollbar. Prefer a **measured** height (`lib/layout/useFillViewportHeight.ts`) over a guessed `calc(100svh − …)`: a guessed offset went stale and gave the Diary page a whole-page scrollbar.<br>• **Smooth collapse:** the width and the gap animate over 250 ms on the page transitions' curve (`cubic-bezier(0.2, 0, 0, 1)`), and the content keeps its width, so nothing re-wraps. The full panel and the `rail` stay mounted as two layers and **cross-fade** (panel out, rail in, and the reverse), instead of swapping on the first frame. The sidebar is **always stretched** to the content's height, with the panel `sticky` at its top, so collapsing never snaps the height. Animation is off while dragging and under reduced motion. A collapsed panel is `inert`.<br>• **Gotcha:** the clip box uses `overflow-clip`, not `overflow-hidden`. `hidden` makes it a scroll container, which silently breaks the inner panel's `sticky`.<br>• The resize handle lives inside the panel's sticky wrapper, so it's exactly the panel's height (not the stretched sidebar's) and fades with it.<br>• `openRequest` re-expands it (e.g. on selecting a note).<br>Used by the Apps rail (`SidebarPanelLayout`'s opt-in `sidePanel`) and the Diary's day-details sidebar. |
| `SidebarToggle.tsx` | The ☰ (hamburger) button that shows or hides a `SidePanel` by `storageKey`, placed in a toolbar: in the Diary, the far left of the header for the Apps list and the far right for day details. It is the same square `border-2 border-ink` `shadow-card` shape as the toolbar's other controls, white when its panel is hidden and ink-filled while it's open. Toolbar placement (not floating in the gap) keeps it aligned and in the same spot in both states. |
| `ProgressBar.tsx` | Simple track + fill, optional `%` label. No longer used on the board (removed from `GroupColumn` in 2.7 — the reference design never shows it on the default view); still a generic primitive, may be reused elsewhere. |
| `BasicNoteCard.tsx`, `CounterNoteCard.tsx`, `ListNoteCard.tsx` | The three note-type cards rendered by `GroupColumn`. Share the `shadow-card`/`text-black`/`SWATCH_CLASSES[color]` treatment (see above); `CounterNoteCard`'s `+`/`−` row order matters — `+` left, `−` right, matching the reference (easy to get backwards). `ListNoteCard` has its own two-piece shape, see above. All three (plus `SearchPage`'s reuse of them) render `NoteStatusStrip` as their last child — see `docs/feat-notes.md`'s "Statuses" section for the full behavior; the one style-system point worth repeating here is that its dark `bg-ink` background is a deliberate departure from every other note-card-adjacent chrome, which uses the note's own swatch color, not a fixed dark token. Since the Diary (2.8), all three take `readOnly` + `onSelect` for the history replay: interactive parts become `inert` (so a replay can never write to the DB), a click selects instead of opening the editor, and no morph name is taken. Their colour fills also have `transition-colors duration-300`, so a recolour cross-fades. |
| `TopNav.tsx` (web) / `BottomNav.tsx` (mobile) | Home (`sticky-yellow`) / Settings (`nav-dark`, yellow gear) / Apps (`sticky-blue`, grid) on web, labelled; Home / Apps / Settings on mobile, icon-only with `aria-label`s — order follows each platform's wireframe. `TopNav` has the backdrop card treatment described above; `BottomNav` doesn't. |
| `FloatingAddButton.tsx` | Mobile quick-add: a 34×100px bell-curve bump fixed flush to the right screen edge, drawn as an inline SVG using the exact path from the mobile Penpot export (`newdesktoplayloutMobile.html`), translated to the origin. The export closes the shape outside the viewBox, which is why there is no outline along the screen edge. `accent-purple` fill (the export uses a lighter `#d47cff`, but the app's existing purple was kept deliberately); the export's inner stroke is reproduced as a 10-wide `stroke-ink` clipped to the shape, so 5px is visible. It has a white bold `font-display` "+" glyph (not `pluse.png`; white rather than the export's dark glyph, for contrast on the darker purple) and `shadow-card` done as a CSS `drop-shadow`, so it follows the curve. Generic (`to`, `position` and `dynamic` props; vertical position is set with `top`, never a transform); `HomePage` decides the target and visibility. See `feat-navigation.md`. |
| `Icon.tsx` | Thin `<img>` wrapper used by everything above. |
| `ExitToast.tsx` | Small fixed-position "Press back again to exit" pill, shown above `BottomNav` when the Android hardware back button/edge-swipe is pressed on Home with no more history — see `docs/feat-navigation.md`. Native-only in practice (driven by `useAndroidBackButton`), but the component itself has no platform branching of its own. |

`AppShell.tsx`, `GroupColumn.tsx`, and `PowerToolsSidebar.tsx` (`src/components/`, not
`components/ui/` — they're layout/domain composites, not dumb primitives) follow the
same pattern as `WorkspaceSwitcher.tsx`: tied to one page's concept, not generic enough
to live in `ui/`. `AppShell` wraps page content with `.bg-grid` + `TopNav`/`BottomNav`
based on `usePlatform().isNative` (plus the `headerStart`/`headerEnd` slots above) —
every page routes through it. `GroupColumn` is the board's column renderer, used by
both the web multi-column layout and the mobile single-active-tab view in
`HomePage.tsx`. `SidebarPanelLayout.tsx` is the generic desktop 2-panel shell;
`PowerToolsSidebar.tsx`'s `PowerToolsDesktopLayout` (Settings) and `AppsSidebar.tsx`'s
`AppsDesktopLayout` (Apps, items from `appsList.ts`) are thin wrappers over it — see
"Power Tools: row chips + desktop 2-panel drill-down" above.

## Platform detection

Always `Capacitor.isNativePlatform()`, wrapped in `lib/platform/usePlatform.ts` — never
a viewport-width breakpoint. Verified the hard way: a resized/narrow browser window
still renders the *web* layout (columns, `TopNav`), not the mobile one (tabs,
`BottomNav`) — that's correct, intentional behavior per this rule, not a bug, and it's
the reason this project's browser-based testing could never actually exercise the
native-only UI paths (confirmed separately on a real Android device — see
`feat-offline-data-layer.md`).
