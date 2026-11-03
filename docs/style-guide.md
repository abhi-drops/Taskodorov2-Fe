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

A `.bg-grid` utility class in `src/index.css`, drawn with two tiled `linear-gradient`
lines (40px cells, `--color-ink` at 12% over `--color-surface`) rather than a raster
image — a fixed `background-size` tile keeps the cell size constant no matter how tall
the container grows, instead of a `cover`-fill image rescaling (and distorting) with its
container's aspect ratio. `background-position-x: 24px` lines up a vertical line with
the shared `p-6` (24px) left edge page headings/content start at, on both web and
mobile. Below the 640px mobile breakpoint, where the board is a single full-width note
column, a media query swaps the fixed-px tile for `background-size:
calc((100% - 48px) / 8) 40px` — dividing the exact content width into 8 even cells so a
line lands on the note's *right* edge too, at any phone width, not just one measured by
hand. Desktop keeps the fixed 40px tile (its `w-[22rem]` column + backdrop
padding/negative-margin combination doesn't reduce to one clean content width the same
way, so there's no equivalent exact-fit formula there). Used on board-type screens only
(`AppShell`), never globally on `body` — auth screens stay flat `bg-surface`.

## Icons

One icon library: **`@animateicons/react`**, Huge family (`@animateicons/react/huge`),
pinned to an exact version (it is 0.x). It is an npm dependency bundled into the app, so
it works offline.

- **`components/ui/icons.ts`** re-exports the icons the app uses under app-level names
  (`HomeIcon`, `CloseIcon`, `TrashIcon`, `DiaryIcon`, ...). `EditIcon` is the library's Pen 01 (it was the pencil). Add a new icon there, never by
  importing from the library at a call site, so the choice of glyph stays in one file.
- **`components/ui/AnimatedIcon.tsx`** is how every icon is rendered:
  `<AnimatedIcon icon={CloseIcon} size={16} />`.
  - It plays the icon's animation when the **button or link it sits in** is hovered (web)
    or tapped (Android has no hover). It finds that ancestor itself
    (`closest('a, button, [role="button"]')`), so call sites need no wiring.
  - `still` turns animation off: used for decorative icons (the check in `Select`'s menu) and for icons repeated in a grid (the Diary calendar's day chips).
  - Colour is `currentColor`: tint with a `text-*` class. Size is the `size` prop in px,
    not `h-*`/`w-*`. For a heavier stroke, add `[&_svg]:stroke-[2.5]` (the counter card's
    + / −, the add-note buttons).
  - **Gotcha:** the library's icon root is a `<div>`, so an icon can't sit inside a `<p>`
    (invalid nesting); use a `<div>`/`<span>` host for text that contains one.
  - The library bundles its own motion runtime (separate from the app's `motion`
    package), which added about 80 kB (23 kB gzip) to the main chunk. It respects
    `prefers-reduced-motion`.
- Text characters are no longer used as icons (no `×`, `⚙`, `‹ ›`, `✓`, `→` ...). Huge has
  no empty-circle glyph, so "unchecked" in the Diary is its undo arrow (`UncheckedIcon`).

**Two exceptions that are not library icons:**
- **The note checkbox.** `CheckCircle.tsx` still composites `check-circle.png` +
  `check-tick.png` through `components/ui/Icon.tsx` (a thin `<img>` wrapper).
- **The search icon** is the original `search.png`, also through `Icon.tsx`, kept by
  choice over the library's magnifier. The two header search links give it a small CSS
  hover effect (tilt + scale via `group-hover`), since a PNG can't use the library's
  animation.
- **`FloatingAddButton`'s purple bump** is an inline SVG because it is the button's shape,
  not an icon; the "+" on it is a library icon.

## Board & note-card system

Reworked in 2.7 to match a Penpot design export (`docs/design-references/`) pixel-for-pixel
instead of the earlier generic Tailwind-defaults look. The 4 `--color-sticky-*` note colors
were also repointed to the exact hex values from that export (yellow `#fbe05d`, coral
`#ff7c8f`, blue `#96c3f7`, green `#c0ff91`) — treat the Penpot export as the source of truth
if these ever look like they've drifted. Two more tokens drive the rest of the board's look,
both in `src/index.css`'s `@theme` block:

- `--color-ink: #3c3c3c` — the one dark color the whole app uses: borders, buttons,
  chip/nav backgrounds, headings and labels (chips, the add-note button, checkbox
  rings, the counter control, `TopNav`/`BottomNav`'s active segment, every page `h1`
  and `Modal` title). There used to be a second, near-black token — `--color-nav-dark`
  (`#1e1e2a`), originally reserved for `TopNav`/`BottomNav` chrome specifically — but
  it had drifted into general use as the app's heading/label color (every page title,
  the workspace switcher, form labels, Calendar/Diary headings, active tab-chip
  backgrounds) well beyond that original scope, reading as near-black everywhere it
  showed up. Retired entirely 2026-10-25 (~40 call sites moved to `ink`, the CSS
  variable removed) rather than kept around for a narrower chrome-only role nothing
  actually needed. If a reason to bring back a distinct nav color ever comes up, treat
  it as a fresh design decision, not a revert.
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

Note-card text is `text-black` (pure black, matches the reference exactly) — the one
deliberate exception to `ink` being the app's single dark color, kept because it
matches the Penpot reference pixel-for-pixel.

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
`bg-sticky-coral text-ink` (label and icon in the border colour) instead of the shared `Button.tsx` `danger` variant (which
has no border) — a shared `DANGER_CHIP` class string exported from `SidebarPanelLayout.tsx` beside `CHIP`
(also used by the note editor's Delete button), not a change to `Button.tsx` itself, since
that primitive is used well beyond this page's aesthetic.
Each group row's box is `GroupIcon` from `components/ui/icons.ts` (see "Icons" above). (Since the 2.7 rename to **Settings**, the Addons/Pomodoro chip
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
This is a genuine `isMobile` branch, not a CSS breakpoint (unlike `NoteEditorPage`'s
`lg:` grid) — the sidebar+drill-down is a real interaction/navigation-model
difference from mobile's flat page stack, not just a layout reflow at the same width.

### Deep-link highlight: `focus-ring-blink`

`SyncStatusBadge.tsx` (the small dark circle left of the header's search icon on both
platforms, `HomePage.tsx`) links to `/settings?tab=account&focus=sync` instead of a
bare `?tab=account` — the `focus=sync` param tells `PowerToolsPage.tsx` to draw the
eye straight to the Sync With Google chip rather than leaving the user to find it
themselves on a page that also has Groups, Board and Reset rows. The pattern is
general enough to reuse for any other badge-style shortcut that should land on and
call out one specific chip: a `focus=<id>` query param read by the destination page,
not a route of its own.

- The highlighted element gets a purple (`--color-accent-purple`) outline that blinks
  4 times at 0.5s each (2s total) via the `focus-ring-blink` keyframes in
  `index.css` — `outline`, not `box-shadow` or `border`, so it overlays the chip's
  existing `border-[3px] border-ink shadow-card` without fighting it for the same CSS
  property. The animation has no `forwards` fill, so it just stops cleanly after 2s
  and the chip's normal border shows through — no JS timer needed to remove the class.
- Scrolling the chip into view can't happen on mount: Settings still has async content
  above it settling in afterwards (groups loading, the "Add Button Position" chip that
  only appears once `useAddButtonSettings` resolves, the mobile slide-tab page
  transition itself), each of which shifts the chip's position after the component
  first mounts. `SyncChip` polls the chip's `getBoundingClientRect().top` on animation
  frames until it holds still for 5 frames in a row (capped at ~2s as a safety net),
  then calls `scrollIntoView({ block: 'center' })` — scrolling against a mount-time
  layout landed short and missed the chip entirely on mobile.

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
what used to be two stacked header rows into one — but **only when `!isMobile`**. On mobile,
`AppShell` doesn't render a top bar at all (there's `BottomNav` instead), so `HomePage` still
renders its own `WorkspaceSwitcher` + search row inline as page content for that platform,
unchanged from before. If you add a new page that needs left/right header content on web,
reuse this prop pair rather than inventing a page-local header row.

### Scrolled header: the "tape material"

**Shared building blocks**, used by both the desktop header and mobile's sticky group-
tab strip (below): `lib/layout/useBlurredPeek.ts` (the `useBlurredPeek` hook) and
`components/ui/TapeBackdrop.tsx` (the `TapeBackdrop` visual layers). Each caller owns its
own positioning (`fixed` vs `sticky`) and figures out its own `contentOffsetTop` (see
`useBlurredPeek`'s own docs for what that number means) — the hook and the backdrop
component don't know or care which. `TapeBackdrop` also takes optional `blurPx`/
`washOpacity` (defaulting to the desktop header's original 24/0.45) — how convincing a
given blur/wash strength looks depends on what's actually behind it: the board's mixed,
saturated note colors blur into an uneven "smudge," but a single note's flat-colored
body (e.g. a list note's solid `sticky-blue`) blurs into a much more even wash at the
same settings and can still read as legible text underneath. The mobile tab strip, which
sits over exactly that kind of flatter content, uses `blurPx={36} washOpacity={0.6}`.

**Desktop**: the whole header row (`TopNav` plus the `headerStart`/`headerEnd` slots) is
`position: fixed`, not `sticky` — `backdrop-filter` on a `sticky` element has known
rendering bugs across browser engines where the blurred backdrop stops live-sampling
scrolled content (it can effectively freeze on whatever was behind it when it first
became stuck). `fixed` removes the header from normal document flow, so `AppShell`
measures its own rendered height with a `ResizeObserver` (not a hardcoded pixel value —
the row's height doesn't vary by content, but guessing it wrong would be a silent, hard
-to-notice layout bug) and renders a spacer of that height right after it, so the board
content below doesn't jump up underneath it.

**Mobile**: `HomePage`'s `StickyGroupTabs` pins whichever of `BoardTabStrip`/
`GroupDropTargets` is active (the board's "Todo / In Progress / Completed" tab row) to
the top of the viewport once scrolled past, with the same tape material. This one *is*
plain `position: sticky` — it already sits in normal page flow below the (non-sticky)
workspace/icons row, so sticky reserves its own layout slot for free, no spacer needed.
Its `contentOffsetTop` is measured directly (`getBoundingClientRect().top + scrollY` on
the `GroupColumn` notes wrapper immediately below it), rather than derived from a known
fixed height the way desktop's is.

Once scrolled (`useScrolled`, `lib/layout/useScrolled.ts`), a backdrop fades in behind
the whole bar — not a box around each item, one continuous surface everything in the row
sits on. It's styled to read as a literal strip of translucent tape laid over the page,
not a plain frosted panel, in four layers (`TapeBackdrop`), bottom to top:

1. **`useBlurredPeek`** — a real, manual blur of whatever's actually behind the bar.
   Plain `backdrop-filter: blur()` turned out not to render at all in some real test
   environments here (GPU/WebView-dependent — confirmed by testing, not assumed), so
   this fakes the same effect with a technique that only needs the far more widely
   supported `filter: blur()`: clone the live scrollable content's DOM once with
   `cloneNode` (**not** a second React render of `children` — re-mounting the real tree
   would re-run every page's hooks/effects a second time, unsafe for anything with real
   side effects like drag-and-drop or DB subscriptions), strip every `id` recursively so
   the clone can never shadow the real element for `getElementById`/`for=`/etc., mark it
   `inert` so it's fully non-interactive and invisible to assistive tech, and translate
   it in lockstep with the page's real scroll position (a rAF-throttled `scroll`
   listener) so the clipped, blurred window shows the same content that's really behind
   the bar. Only re-clones when it turns active, not continuously — blurred this
   heavily, staleness between re-clones is imperceptible.
2. A translucent `bg-white/45` wash over the blurred peek, so the bar's own text/icons
   stay legible without hiding the blur entirely.
3. `feTurbulence` grain (`tape-grain`, `mix-blend-overlay`): the slightly fibrous/
   bubbled texture of tape's adhesive side, generated inline — no image asset,
   consistent with this app's no-external-asset stance elsewhere — rather than a flat,
   too-clean blur.
4. A diagonal multi-stop white gradient (`mix-blend-screen`) standing in for light
   refracting across the tape's surface, plus a 1px top highlight line for the raised
   edge catching light.

All four layers fade in together via the wrapper's opacity. This replaced an earlier
version of this effect built on each slot's own `border-ink`/die-cut-sticker outline
(an SVG `feMorphology` silhouette halo) — that approach never actually read as part of
this app (every other "chip" here is a plain bordered box, not a shape that traces its
own content's silhouette) and is not what's in the code now; don't resurrect it from
git history as a reference.

**Don't let it stack with another translucent overlay.** Something like
`WorkspaceSwitcher`'s dropdown (a `bg-white/60 backdrop-blur-sm` dim covering the whole
screen, including the header) will compound with the header's own wash/grain/sheen
wherever they overlap into a far-more-washed-out look than either intends — call
`useSuppressHeaderBackdrop(isOpen)` (`lib/layout/headerBackdropSuppression.ts`) from
anything that opens a similar full-screen dim, so the header/tab-strip backdrop gets out
of its way for as long as it's open.

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

## Pointer cursor

Every enabled clickable shows the hand cursor, from **one base-layer rule in
`src/index.css`** (buttons, links, `role="button"`/`tab`/`switch`/`checkbox`/`radio`,
selects). Tailwind v4's reset gives buttons the arrow, which is why this rule exists.
Don't add `cursor-pointer` to buttons or links; it is only needed on a clickable element
that is none of those (a clickable `<div>`, as on the note cards). Because the rule is in
the base layer, utilities still override it: `disabled:cursor-not-allowed`,
`cursor-default`, `cursor-grab`. Disabled controls keep the arrow.

## Shared primitives (`src/components/ui/`)

All follow the same shape: extend the matching native HTML element's attributes
interface, accept an optional `className` for override, `rounded-card` everywhere (the
only radius token used anywhere in the app — currently `0px`, see "Board & note-card
system" above).

| Component | Purpose |
|---|---|
| `Button.tsx` | `primary`/`secondary`/`ghost`/`danger` variants. `danger` (coral) was added in 2.4 once destructive actions crossed 3 call sites. |
| `TextField.tsx` | Labeled text input, label-above-control shape. |
| `Select.tsx` | Labeled dropdown on **Radix Select** (`@radix-ui/react-select`, headless: Radix supplies keyboard, typeahead, focus and screen-reader behaviour; the styling is ours). Web only: a native `<select>`'s option list can't be styled. **On mobile (`isMobile`: Android, or phone-sized web) it renders a native `<select>`**, so the options open in the system picker; the closed control keeps the same chip look.<br>• Trigger and menu are both the board's chip shape: square, `border-[3px] border-ink`, `shadow-card`, white. The trigger turns `sticky-yellow` while open or keyboard-focused (no violet focus ring).<br>• The highlighted option is `sticky-yellow`; the chosen one is bold with a `CheckIcon`. The menu is as wide as the trigger and opens in a portal (`z-[70]`).<br>• API: `label`, `value`, `onChange(value)`, `options: { value, label }[]` (generic over the value's string type, so no casts at call sites). **Gotcha:** an option's value can't be `''` (Radix reserves it); use `'none'`. |
| `Modal.tsx` | `variant: 'center' \| 'full-page'`. Portal-rendered, closes on Escape/backdrop click and, on Android, on the back button (`lib/platform/backHandlers.ts`: the newest open modal closes first, before any navigation). **`full-page` is the mobile variant** (it replaced the old 85%-height bottom sheet): it covers the whole screen with the title and the close (X) button in the top corner, pads for the status and gesture bars with `env(safe-area-inset-*)`, scrolls its content, and has no overlay, border or shadow, so `overlayClassName`/`panelClassName` don't apply to it. A centred panel always has the chips' `border-[3px] border-ink`, so every dialog is bordered. Default overlay/panel are still `bg-black/40`/`shadow-lg`, not migrated to `shadow-card`. Optional `overlayClassName`/`panelClassName` fully *replace* (not append to) those defaults when passed, since two same-specificity Tailwind utilities for the same CSS property have no guaranteed winner by JSX class-string order; `ConfirmDialog.tsx` (see below) and the centred template dialogs use them, both opting into the same frosted-white-dim + deeper-shadow look. `size="large"` (centre variant only) makes the panel about 60% of the screen's width and 90% of its height, with the content area filling it so a child can pin a footer; the desktop New workspace dialog uses it. |
| `ConfirmDialog.tsx` | Wraps `Modal` — message + Cancel/danger-confirm button pair. Added in 2.4 once destructive confirmations (group delete, note delete, Reset to Default) crossed 3 uses. Uses `Modal`'s `overlayClassName`/`panelClassName` for the same frosted-white-dim + deeper-offset-shadow look `WorkspaceSwitcher` introduced — every confirm dialog in the app (notes, groups, workspaces, Reset to Default) gets it automatically, since they all go through this one component. |
| `CheckCircle.tsx` | The note-complete/list-item toggle. Composites `check-circle.png` (ring, always shown) + `check-tick.png` (overlaid when checked) — **not** two same-size icons: the tick is deliberately oversized (`size * 1.4`) and offset with proportional inline styles (`marginLeft`, tick `left`/`top` all computed as a fraction of `size`, not fixed px/rem) so the same "bold stamp" look holds at every call-site size (18 in list items, 20-22 elsewhere) instead of only looking right at whichever size it was last eyeballed against. Also carries `max-w-none` on the tick `<img>` — **required**, not decorative: Tailwind's preflight sets `img { max-width: 100% }`, and since the tick is absolutely positioned inside the small `size`×`size` button (its containing block for percentage resolution), `max-width: 100%` silently resolves to the *button's* small size and clamps the oversized tick's width back down — height isn't affected (no `max-height` rule), so the symptom is a squashed/stretched icon, not a missing one. Any future absolutely-positioned icon that needs to render larger than its positioned-ancestor box will hit this exact clamp; add `max-w-none` again if so. |
| `BackLink.tsx` | Desktop-only circular back button: a round `border-2 border-ink` `shadow-card` button carrying `ChevronLeftIcon`, the same weight as `CheckCircle`'s circle (though it doesn't share that component — no PNG compositing needed for a single static glyph). `fixed left-6 top-6 z-40`, pinned to the actual top-left corner of the viewport above `AppShell`'s `z-30` header, not placed inline in page flow or tied to scroll position. Self-gates on `isMobile` (renders `null`), so it's safe to drop into a component shared with mobile rather than needing a desktop-only branch at the call site. Navigates `history.back()` (`navigate(-1)`), falling back to `/` when `location.key === 'default'` (a direct URL load/refresh has no prior entry to go back to). Not global `AppShell` chrome — each page that wants it renders `<BackLink />` itself; currently Settings, group settings and the note editor. |
| `Tabs.tsx` | Single-select segmented control (Todo/In Progress/Completed style, also reused for the board's group tabs and search's group-scope tabs). |
| `SwatchPicker.tsx` | Single-select 4-color note-color picker. The row is inset `px-1`: the selected swatch's ring reaches 4px outside its circle, and the inset keeps that ring flush with the left edge of the fields around it. Colors/classes live in `swatchColors.ts` (split out from `SwatchPicker.tsx` itself — the component and the constants can't share a file without breaking React Fast Refresh, which requires component-only files). Disabled state (`noteColorMode !== 'manual'`, i.e. `priority` mode) is `pointer-events-none opacity-35` — dimmed to visually read as non-interactive, unlike most disabled controls in this app which only block interaction. In the note editor, a `priority`-mode note also shows a bordered/tinted callout ("Color is set by priority for this group.") directly under the picker, styled `rounded-card border-2 border-ink` with its background tinted to the note's own resolved color (`SWATCH_TINT_CLASSES[displayColor]` in `swatchColors.ts` — each swatch color at 15% opacity, e.g. `bg-sticky-yellow/15`) rather than a fixed accent color, so the callout visually matches whichever priority color is currently active. `swatchColors.ts` also exports `SWATCH_TEXT_CLASSES` (`text-sticky-*`, added for `NoteStatusStrip`/the note editor's Status block — swatch-colored *text* on a dark background, rather than a swatch-colored background) and `SWATCH_PLACEHOLDER_TEXT_CLASSES` (the `placeholder:text-sticky-*/60` counterpart, kept as its own map of complete literal class strings rather than built by concatenating a `placeholder:` prefix onto `SWATCH_TEXT_CLASSES` at the call site — Tailwind's content scanner needs a class's full string to appear literally somewhere in scanned source to generate its CSS, which a runtime-only template-literal concatenation wouldn't satisfy). |
| `Calendar.tsx` | Generic month grid on react-day-picker v9. Its stylesheet is **not** imported: square `rounded-card` cells with `border-2 border-ink` and `shadow-card`, today in `sticky-yellow`, outside days at 40%. The header is our own yellow square chevron buttons (`ChevronLeftIcon`/`ChevronRightIcon`) and the month name (from the Diary wireframe). Callers render per-day content with `renderDay`, passed to the module-level day button through context so cells don't remount every render. First used by the Diary (`feat-diary.md`). |
| `StarRating.tsx` | Five `StarIcon`s that register half steps (left half of a star = `n - 0.5`, right half = `n`), value `0`–`5`. A single `role="slider"` for assistive tech (arrow keys move by 0.5) rather than ten buttons. A partly-filled star is two stacked icons, the filled one clipped by an `overflow-hidden` wrapper whose width is the fill fraction. Used by `FeedbackDialog`. |
| `Scrubber.tsx` | Generic frame slider on Radix Slider: an ink track, a **round** yellow thumb (round on purpose, matching the wireframe, the one round control in the app), a tick per frame (hidden above 120), and a square Play/Pause button. Accessible, with arrow keys and touch drag. Takes `frameCount`/`frame`/`onChange`; no Diary logic. |
| `SidePanel.tsx` | Desktop sidebar that is collapsible, drag-resizable and capped to the screen height.<br>• It has **no toggle of its own**: a `SidebarToggle` in the page's toolbar opens and closes it. They share state by `storageKey` through a tiny store in `lib/storage/panelLayout.ts` (`useSyncExternalStore`).<br>• **Collapsing removes it entirely**: the width animates to exactly 0 with no padding sliver, and the gap beside it, which the panel owns as `gap` margin, closes too. Parents put no flex gap next to it. (An earlier version left a thin border line and an empty gap behind it.)<br>• Optional **`rail`**: instead of disappearing, a collapsed panel shows this slim strip (`railWidth`, default 52px) with a half gap. The strip `self-stretch`es to the height of the content beside it. The Apps list uses it for an icon rail; the Diary's day details doesn't.<br>• Drag the inner edge to resize: it is an accessible `separator`, ←/→ steps 16px and double-click resets.<br>• Width and collapsed state are remembered per `storageKey` (`lib/storage/panelLayout.ts`, synchronous `localStorage` so there's no jump on load).<br>• `sticky` with a `maxHeight` cap and its own scrollbar. Prefer a **measured** height (`lib/layout/useFillViewportHeight.ts`) over a guessed `calc(100svh − …)`: a guessed offset went stale and gave the Diary page a whole-page scrollbar.<br>• **Smooth collapse:** the width and the gap animate over 250 ms on the page transitions' curve (`cubic-bezier(0.2, 0, 0, 1)`), and the content keeps its width, so nothing re-wraps. The full panel and the `rail` stay mounted as two layers and **cross-fade** (panel out, rail in, and the reverse), instead of swapping on the first frame. The sidebar is **always stretched** to the content's height, with the panel `sticky` at its top, so collapsing never snaps the height. Animation is off while dragging and under reduced motion. A collapsed panel is `inert`.<br>• **Gotcha:** the clip box uses `overflow-clip`, not `overflow-hidden`. `hidden` makes it a scroll container, which silently breaks the inner panel's `sticky`.<br>• The resize handle lives inside the panel's sticky wrapper, so it's exactly the panel's height (not the stretched sidebar's) and fades with it.<br>• `openRequest` re-expands it (e.g. on selecting a note).<br>Used by the Apps rail (`SidebarPanelLayout`'s opt-in `sidePanel`) and the Diary's day-details sidebar. |
| `SidebarToggle.tsx` | The menu (hamburger, `MenuIcon`) button that shows or hides a `SidePanel` by `storageKey`, placed in a toolbar: in the Diary, the far left of the header for the Apps list and the far right for day details. It is the same square `border-2 border-ink` `shadow-card` shape as the toolbar's other controls, white when its panel is hidden and ink-filled while it's open. Toolbar placement (not floating in the gap) keeps it aligned and in the same spot in both states. |
| `ProgressBar.tsx` | Simple track + fill, optional `%` label. No longer used on the board (removed from `GroupColumn` in 2.7 — the reference design never shows it on the default view); still a generic primitive, may be reused elsewhere. |
| `BasicNoteCard.tsx`, `CounterNoteCard.tsx`, `ListNoteCard.tsx` | The three note-type cards rendered by `GroupColumn`. Share the `shadow-card`/`text-black`/`SWATCH_CLASSES[color]` treatment (see above); `CounterNoteCard`'s `+`/`−` row order matters — `+` left, `−` right, matching the reference (easy to get backwards). `ListNoteCard` has its own two-piece shape, see above. All three (plus `SearchPage`'s reuse of them) render `NoteStatusStrip` as their last child — see `docs/feat-notes.md`'s "Statuses" section for the full behavior; the one style-system point worth repeating here is that its dark `bg-ink` background is a deliberate departure from every other note-card-adjacent chrome, which uses the note's own swatch color, not a fixed dark token. Since the Diary (2.8), all three take `readOnly` + `onSelect` for the history replay: interactive parts become `inert` (so a replay can never write to the DB), a click selects instead of opening the editor, and no morph name is taken. Their colour fills also have `transition-colors duration-300`, so a recolour cross-fades. |
| `TopNav.tsx` (web) / `BottomNav.tsx` (mobile) | Home (`sticky-yellow`) / Settings (`ink`, yellow gear and label) / Apps (`sticky-blue`, grid) on web, labelled; Home / Apps / Settings on mobile, icon-only with `aria-label`s — order follows each platform's wireframe. `TopNav` has the backdrop card treatment described above; `BottomNav` doesn't. |
| `FloatingAddButton.tsx` | Mobile quick-add: a 34×100px bell-curve bump fixed flush to the right screen edge, drawn as an inline SVG using the exact path from the mobile Penpot export (`newdesktoplayloutMobile.html`), translated to the origin. The export closes the shape outside the viewBox, which is why there is no outline along the screen edge. `accent-purple` fill (the export uses a lighter `#d47cff`, but the app's existing purple was kept deliberately); the export's inner stroke is reproduced as a 10-wide `stroke-ink` clipped to the shape, so 5px is visible. It has a white `PlusIcon` (white rather than the export's dark glyph, for contrast on the darker purple) and `shadow-card` done as a CSS `drop-shadow`, so it follows the curve. Generic (`to`, `position` and `dynamic` props; vertical position is set with `top`, never a transform); `HomePage` decides the target and visibility. See `feat-navigation.md`. |
| `AnimatedIcon.tsx` + `icons.ts` | The app's icons: see "Icons" above. |
| `Icon.tsx` | Thin `<img>` wrapper, used by `CheckCircle` and the search icon. |
| `dialogStyles.ts` | Class strings for dialogs built on `Modal`: `DIALOG_OVERLAY` / `DIALOG_SHADOW` (the frosted dim and deep shadow `WorkspaceSwitcher` and `ConfirmDialog` use), `DIALOG_PRIMARY_BUTTON` (see below), `FIELD_LABEL` (same as `Select`'s label) and `FIELD_INPUT` (a text input in `Select`'s trigger shape, `sticky-yellow` while focused). Used by the New workspace, New template, template editor and feedback dialogs. **Violet buttons in dialogs:** every violet (primary) action button inside a dialog — Send feedback, Create workspace/template, Continue on web, Update Now — gets `DIALOG_PRIMARY_BUTTON` (`border-[3px] border-ink shadow-card`), the chips' ink border plus card shadow. The shadow alone (`1px 3px`, 20% black) is too faint to read on violet, so the border is what makes it match the chips and `FIELD_INPUT` beside it. Pass it as `className` to `Button` (or append it to an `<a>` styled as one). The white secondary button (Cancel, Remind me later) and the coral danger confirm in `ConfirmDialog` are unchanged. |
| `ExitToast.tsx` | Small fixed-position "Press back again to exit" pill, shown above `BottomNav` when the Android hardware back button/edge-swipe is pressed on Home with no more history — see `docs/feat-navigation.md`. Native-only in practice (driven by `useAndroidBackButton`), but the component itself has no platform branching of its own. |

`AppShell.tsx`, `GroupColumn.tsx`, and `PowerToolsSidebar.tsx` (`src/components/`, not
`components/ui/` — they're layout/domain composites, not dumb primitives) follow the
same pattern as `WorkspaceSwitcher.tsx`: tied to one page's concept, not generic enough
to live in `ui/`. `AppShell` wraps page content with `.bg-grid` + `TopNav`/`BottomNav`
based on `usePlatform().isMobile` (plus the `headerStart`/`headerEnd` slots above) —
every page routes through it. On desktop the header row is `position: fixed` (with a
measured spacer — see "Scrolled header: the tape material" above for why, and for the
scrolled backdrop's own layers). `GroupColumn` is the board's
column renderer, used by
both the web multi-column layout and the mobile single-active-tab view in
`HomePage.tsx`. `SidebarPanelLayout.tsx` is the generic desktop 2-panel shell;
`PowerToolsSidebar.tsx`'s `PowerToolsDesktopLayout` (Settings) and `AppsSidebar.tsx`'s
`AppsDesktopLayout` (Apps, items from `appsList.ts`) are thin wrappers over it — see
"Power Tools: row chips + desktop 2-panel drill-down" above.

`TemplateThumb.tsx` (`src/components/`) is the Templates feature's one new visual: a tiny
board drawn from the board's own shapes (ink bar per group, a sticky-coloured block per
sample note). `TemplatesShell.tsx` also exports `TOOLBAR_BUTTON`, a labelled version of
`SidebarToggle`'s square `border-2 border-ink shadow-card` toolbar control. New icons in
`icons.ts`: `TemplatesIcon`, `ExportIcon`, `ImportIcon`, `DuplicateIcon`, `AiGuideIcon`, and the brand marks `ChatGptIcon`, `ClaudeIcon`, `GeminiIcon` (used only to name those assistants on the Generate with AI tile). See
`feat-templates.md`.

## Platform detection

`lib/platform/usePlatform.ts` returns two flags, and they mean different things:

- **`isNative`** (`Capacitor.isNativePlatform()`): running inside the Android app. Gate
  **native APIs** on this: haptics, the back button, the share sheet, native Google
  sign-in, native SQLite.
- **`isMobile`** (`isNative`, or a web window under 640px): the mobile layout is showing.
  Gate **layout** on this: tabs vs columns, `BottomNav` vs `TopNav`, full-page vs centred
  modals, the native `<select>`.

So a phone-sized browser window renders the mobile layout (see `feat-navigation.md`,
"Responsiveness"), but never the native API paths. Don't add a third rule (a CSS
breakpoint or a `matchMedia` call of your own) to pick a layout: read `isMobile`, or
`isMobileLayout()` from `lib/platform/mobileLayout.ts` outside React. Browser testing can
now exercise the mobile UI, but still not anything gated on `isNative`; that needs a real
device or emulator (see `feat-offline-data-layer.md`).
