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
`Modal`'s close "×" is `pluse.png` rotated 45°; `BottomNav`'s "+" is `pluse.png` with a
`brightness(0) invert(1)` CSS filter to render white-on-purple. One-off glyphs that
don't fit the PNG set (`Select`'s dropdown chevron, `WorkspaceSwitcher`'s trigger
chevron, `PowerToolsPage`'s gear/clock/box icons) are small inline SVGs or Unicode
characters instead of pulling in an icon library for a single glyph.

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
`ClockIcon`/`BoxIcon` (Pomodoro / each group row) are small inline SVGs local to
`PowerToolsPage.tsx`, following the same one-off-glyph convention as the gear/chevron
icons above rather than adding new PNG assets.

**Mobile is unchanged in structure** — still the single scrolling page (Addon Tools →
Groups → Account) and the separate full-page Group Settings screen, just reskinned;
this matches the two distinct mobile mockups exactly.

**Desktop gained a real structural change**: a persistent left sidebar
(`components/PowerToolsSidebar.tsx`'s `PowerToolsSidebar`, 3 tabs — Groups/Addons/
Account & Sync, via `?tab=` on `/power-tools`) with a right panel that swaps content
depending on the selected tab, and — when a specific group is opened — "drills down"
into that group's settings in the same right-panel position, mimicking a single
2-panel app even though `/power-tools` and `/power-tools/groups/:id` are still two real
routes underneath (kept as separate routes deliberately, so browser back/forward and
deep-linking still work — see `docs/feat-power-tools.md`). No explicit "Back" control
in the detail view — the persistent sidebar's own "Groups" tab
(`<PowerToolsSidebar activeTab="groups" />`, rendered by both pages) is the way back,
so a separate back link would be redundant.

Desktop-only, both panels sit on their own backdrop card —
`components/PowerToolsSidebar.tsx`'s `PowerToolsDesktopLayout` wraps the sidebar and
the right-panel content each in `border-neutral-300 bg-surface shadow-card`, the same
"light panel behind the content" treatment `GroupColumn`'s note-list backdrop and
`TopNav`'s pill backdrop use on the board — rather than floating the row chips/sidebar
tabs directly on `.bg-grid` the way earlier revisions of this page did. `PowerToolsPage`
and `GroupSettingsPage` both render through `PowerToolsDesktopLayout` on desktop
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

## Shared primitives (`src/components/ui/`)

All follow the same shape: extend the matching native HTML element's attributes
interface, accept an optional `className` for override, `rounded-card` everywhere (the
only radius token used anywhere in the app — currently `0px`, see "Board & note-card
system" above).

| Component | Purpose |
|---|---|
| `Button.tsx` | `primary`/`secondary`/`ghost`/`danger` variants. `danger` (coral) was added in 2.4 once destructive actions crossed 3 call sites. |
| `TextField.tsx`, `Select.tsx` | Labeled form inputs, label-above-control shape. |
| `Modal.tsx` | `variant: 'center' \| 'bottom-sheet'`. Portal-rendered, closes on Escape/backdrop click. Still `shadow-lg`, not yet migrated to `shadow-card`. |
| `ConfirmDialog.tsx` | Wraps `Modal` — message + Cancel/danger-confirm button pair. Added in 2.4 once destructive confirmations (group delete, note delete, Reset to Default) crossed 3 uses. |
| `CheckCircle.tsx` | The note-complete/list-item toggle. Composites `check-circle.png` (ring, always shown) + `check-tick.png` (overlaid when checked) — **not** two same-size icons: the tick is deliberately oversized (`size * 1.4`) and offset with proportional inline styles (`marginLeft`, tick `left`/`top` all computed as a fraction of `size`, not fixed px/rem) so the same "bold stamp" look holds at every call-site size (18 in list items, 20-22 elsewhere) instead of only looking right at whichever size it was last eyeballed against. Also carries `max-w-none` on the tick `<img>` — **required**, not decorative: Tailwind's preflight sets `img { max-width: 100% }`, and since the tick is absolutely positioned inside the small `size`×`size` button (its containing block for percentage resolution), `max-width: 100%` silently resolves to the *button's* small size and clamps the oversized tick's width back down — height isn't affected (no `max-height` rule), so the symptom is a squashed/stretched icon, not a missing one. Any future absolutely-positioned icon that needs to render larger than its positioned-ancestor box will hit this exact clamp; add `max-w-none` again if so. |
| `Tabs.tsx` | Single-select segmented control (Todo/In Progress/Completed style, also reused for the board's group tabs and search's group-scope tabs). |
| `SwatchPicker.tsx` | Single-select 4-color note-color picker. Colors/classes live in `swatchColors.ts` (split out from `SwatchPicker.tsx` itself — the component and the constants can't share a file without breaking React Fast Refresh, which requires component-only files). Disabled state (`noteColorMode !== 'manual'`) is `pointer-events-none` only — deliberately **not** dimmed with `opacity-50`; the four swatch colors always render at full, true opacity, disabled or not. |
| `ProgressBar.tsx` | Simple track + fill, optional `%` label. No longer used on the board (removed from `GroupColumn` in 2.7 — the reference design never shows it on the default view); still a generic primitive, may be reused elsewhere. |
| `BasicNoteCard.tsx`, `CounterNoteCard.tsx`, `ListNoteCard.tsx` | The three note-type cards rendered by `GroupColumn`. Share the `shadow-card`/`text-black`/`SWATCH_CLASSES[color]` treatment (see above); `CounterNoteCard`'s `+`/`−` row order matters — `+` left, `−` right, matching the reference (easy to get backwards). `ListNoteCard` has its own two-piece shape, see above. |
| `TopNav.tsx` (web) / `BottomNav.tsx` (mobile) | Home/Power Tools (web, 2 items) vs Home/+/Power Tools (mobile, 3 items) — deliberately not matched 1:1, since the mockups themselves differ here. `TopNav` has the backdrop card treatment described above; `BottomNav` doesn't (out of scope for the 2.7 rework — mobile board polish wasn't part of that pass). |
| `Icon.tsx` | Thin `<img>` wrapper used by everything above. |
| `ExitToast.tsx` | Small fixed-position "Press back again to exit" pill, shown above `BottomNav` when the Android hardware back button/edge-swipe is pressed on Home with no more history — see `docs/feat-navigation.md`. Native-only in practice (driven by `useAndroidBackButton`), but the component itself has no platform branching of its own. |

`AppShell.tsx`, `GroupColumn.tsx`, and `PowerToolsSidebar.tsx` (`src/components/`, not
`components/ui/` — they're layout/domain composites, not dumb primitives) follow the
same pattern as `WorkspaceSwitcher.tsx`: tied to one page's concept, not generic enough
to live in `ui/`. `AppShell` wraps page content with `.bg-grid` + `TopNav`/`BottomNav`
based on `usePlatform().isNative` (plus the `headerStart`/`headerEnd` slots above) —
every page routes through it. `GroupColumn` is the board's column renderer, used by
both the web multi-column layout and the mobile single-active-tab view in
`HomePage.tsx`. `PowerToolsSidebar.tsx` exports both `PowerToolsSidebar` (the
desktop-only persistent left-panel tabs) and `PowerToolsDesktopLayout` (the 2-panel
backdrop-card shell wrapping it + the right panel), shared by
`PowerToolsPage`/`GroupSettingsPage` — see "Power Tools: row chips + desktop 2-panel
drill-down" above.

## Platform detection

Always `Capacitor.isNativePlatform()`, wrapped in `lib/platform/usePlatform.ts` — never
a viewport-width breakpoint. Verified the hard way: a resized/narrow browser window
still renders the *web* layout (columns, `TopNav`), not the mobile one (tabs,
`BottomNav`) — that's correct, intentional behavior per this rule, not a bug, and it's
the reason this project's browser-based testing could never actually exercise the
native-only UI paths (confirmed separately on a real Android device — see
`feat-offline-data-layer.md`).
