# Changelog

All notable changes to Taskodoro-Fe. Newest first. Entries are a log of *what changed
and when* — for *how a feature works*, see the relevant `docs/feat-*.md` file linked
from each entry. See `CLAUDE.md` for the rule on keeping this updated.

## 2026-10-04 — Styled dropdown replaces the native select

`Select.tsx` is now built on Radix Select (`@radix-ui/react-select`) and styled as the
board's chip: ink border, hard shadow, yellow highlight, check on the chosen option. All
seven dropdowns use it (note type and priority, group settings, Completed Group). On
Android it stays a native select (system picker) with the same chip look when closed. Its API
changed from `<option>` children to an `options` array. The main JS chunk grew by about
85 kB (30 kB gzip). See `style-guide.md`, "Shared primitives".

## 2026-10-04 — Note editor saves title, description and status while typing

Edits to a note's title, description and existing statuses now save after a 600 ms pause
in typing, not only on blur. Blur still saves immediately, and leaving the editor flushes
a pending save. A new note is still created on the first title blur. See `feat-notes.md`,
"Debounced saves".

So the Diary doesn't fill with half-typed text, title and status-text edits are coalesced
when logged: edits to the same title or status within 3 minutes, with nothing else
happening to the note in between, update one event instead of adding more. Typing back to
the original removes it. See `feat-diary.md`, "Data: the activity log".

Also in the editor: the add-status button is a borderless add-square icon, and on the
single-column layout the Note Type / Color / Priority / Delete block is as wide as the
note card.

## 2026-10-04 — One animated icon library replaces PNGs, inline SVGs and text glyphs

Every icon now comes from `@animateicons/react` (Huge family). Before, icons were a mix of
PNGs, hand-written inline SVGs and Unicode characters.

- **New:** `components/ui/icons.ts` (the app's icon set, one place to change a glyph) and
  `components/ui/AnimatedIcon.tsx` (renders an icon and animates it when its button or
  link is hovered on web or tapped on Android).
- **Replaced:** the nav, delete, add and close icons; chevrons, the sidebar menu
  button, the Scrubber's play/pause; the `×`, `⚙`, `‹ ›`, `+`, `−` text buttons; and the
  Diary's `✓ ○ ✎ ↔ → ↺ ▸` markers.
- **Removed:** `ui/NavIcons.tsx` and `home.png`, `delete.png`, `pluse.png`, `power-tools.png`.
- **Unchanged on purpose:** the note checkbox (`CheckCircle` and its two PNGs) and the
  search icon (`search.png`).
- **Cost:** the main JS chunk grew by about 80 kB (23 kB gzip).

See `style-guide.md`, "Icons".

## 2026-10-04 — Default Completed Group for new users

The first-run seed now sets the workspace's Diary "Completed Group" to the seeded
**Completed** column. A new user, or anyone using Reset to Default, gets a working
"Completed" count in the Diary without visiting Settings. Existing workspaces are
unchanged. See `feat-diary.md`.

## 2026-10-04 — Diary tracks status edits and deletions; list wording

**The status problem:** statuses were only read from the note's current status list.
- **Deleting a status erased it from history:** its "added" entry vanished from past
  days, and replay cards forgot it.
- **Editing a status rewrote the past:** old frames showed the new text.

**The fix:**
- `updateNote` now logs a `status` event for every status **edit** (old → new text) and
  **deletion** (its text and original `createdAt`).
- The replay rebuilds each status's full history:
  - a deleted status still shows "added" on its day and stays on the cards until the
    moment it was deleted;
  - an edited status shows its original text before the edit;
  - edits and deletions get their own entries: **✎ Status** (old → new) and **Status
    deleted** (coral, struck through).
- Status events are loaded for all dates, because a status deleted next week was still
  there today.
- New count tiles: "Status edits" and "Statuses deleted".

**List items:** deleting and editing items were already tracked through the list
snapshots. Their wording is now "deleted" and "edited" (was "removed" and "renamed").

Verified with a third check script (14 checks); the earlier 40 still pass. See
`feat-diary.md`.

## 2026-10-03 — Smooth sidebar collapse/expand

Collapsing and expanding the desktop sidebars (Apps list, Diary day details) was jumpy:
- the content swapped on the first frame;
- the height snapped between content height and stretched;
- the easing was generic.

Now:
- **Cross-fade:** the full panel and the icon rail are two layers that cross-fade while
  the width animates.
- **No height snap:** the sidebar is always stretched to the content's height, with the
  panel sticky at its top.
- **Motion:** 250 ms on the same curve as the page transitions, and off under reduced
  motion.

The clip box now uses `overflow-clip`, because `overflow-hidden` would break the inner
`sticky`. The resize handle moved inside the panel, so it is the panel's height and fades
with it. See `style-guide.md`.

## 2026-10-03 — Desktop: collapsed Apps list becomes an icon rail

Collapsing the Apps list with its ☰ toggle now leaves a slim strip of app icons instead
of hiding it completely:
- the active app is in its ink-bordered chip, and disabled apps are dimmed;
- each icon has a tooltip and is clickable;
- the strip is stretched to the active app's panel height.

This is a new optional `rail` prop on `SidePanel`. The Diary's day-details sidebar
doesn't use it, so it still collapses fully. See `feat-apps.md` and `style-guide.md`.

## 2026-10-03 — Diary colour scheme

One colour scheme for the Diary's action chips, count tiles and calendar day chips:
- **violet:** Created;
- **green:** ✓ Checked and ✓ Completed;
- **yellow:** content updates (Counter, Renamed, Color, List, ○ Unchecked);
- **black with yellow text:** Status;
- **unchanged:** blue Moved and coral Deleted.

The "Open note" button is now sticky yellow. Text colours are set per chip instead of
being stacked on a shared class, because two `text-*` utilities on one element have no
guaranteed winner in Tailwind. See `feat-diary.md`.

## 2026-10-03 — Diary: restyled "Open note" button

In the desktop day-details sidebar, "Open note" was a plain purple text link. It is now
a full-width button in the app's chip style:
- square, `border-2 border-ink`, `shadow-card`;
- `font-display` uppercase "OPEN NOTE →";
- the add-note purple;
- a small press-down effect.

## 2026-10-03 — Diary tracks checked/unchecked, counter values and list changes

**What it tracks now**
- The activity log now records three more note fields:
  - `completed` (checked/unchecked);
  - `counter` (the value);
  - `list` (a snapshot of the items).
- `updateNote` diffs them like title and colour, using one shared encoding
  (`trackedNoteFields`), so only real changes log. A step/target edit doesn't log a
  counter change.
- Creating a note logs their starting values.
- A one-time catch-up (`backfillTrackedStateIfMissing`) gives existing notes those
  starting values, at their creation time, so the first change after this update shows
  "from → to" and nothing appears as a fake change today.

**How it shows up**
- **Counter:** a burst of taps (each within 60 s, nothing in between) is **one entry and
  one scrubber stop**, e.g. `3 → 8 +5`. A "▸ Show N taps" toggle expands it to every tap
  with its time, value and delta. Every tap is still stored.
- **List:** each update is diffed into item-level lines: ✓ checked, ○ unchecked,
  + added, − removed, ✎ renamed. A reorder-only update shows nothing.
- **Checked / Unchecked:** their own chips.
- **Reset on move:** On Check Move To's automatic "reset to unchecked" is folded into the
  move entry ("↺ reset to unchecked") instead of appearing as a separate uncheck.
- **Replay:** cards now show the historical checkmark, counter value and list ticks at
  each frame, not current values.
- **Counts:** new tiles for Checked, Unchecked, Counter and List updates.
- **Calendar:** the "changes" rollup applies the same merging and folding, so it agrees
  with the day view.

Verified with a second check script (20 checks), and the original 20 still pass. See
`feat-diary.md`.

## 2026-10-03 — Diary: clearer change list (chips, swatches, better wording)

The Diary's list of changes (desktop sidebar and mobile summary) was reworked from flat
sentences like `Moved 'X': Todo → In Progress` into a scannable layout:

- **Top line:** a colour-coded action chip (Created / Moved / Renamed / Color / Status /
  Deleted, matching the count tiles), a **✓ Completed** chip on moves into the Completed
  group, and the time.
- **Title:** the note's title in bold.
- **Detail line:**
  - group chips for moves (`[Todo] → [In Progress]`);
  - before → after swatches for colour changes;
  - "was ~~old title~~" for renames;
  - the status in the same dark strip notes use.
- **Wording:**
  - grammatical sentences kept as each entry's accessible name, for example
    `Moved “X” from Todo to In Progress`;
  - "Renamed" and "Color" instead of "Retitled" and "Recoloured", matching the app's
    spelling;
  - the count tiles read "Renamed" and "Color changes".
- **Times:** shown in the device's own format (e.g. 3:53 PM), and the scrubber's first
  stop reads "Start".
- **Code:** `FeedEntry` gained structured fields (`title`, `fromGroup`, `toGroup`,
  `previousTitle`, `previousColor`, `statusText`). The replay check script was re-run
  (20 checks, all passing).

See `feat-diary.md`.

## 2026-10-03 — Diary (mobile): backdrop card behind the change list

On the mobile day summary, the list of changes now sits in a light backdrop card with a
"Changes" heading. It is the same `border-neutral-300 bg-surface shadow-card` treatment
as the board's group columns and the desktop day sidebar, instead of floating on the
grid background. See `feat-diary.md`.

## 2026-10-03 — Fix: Diary day page had a whole-page scrollbar

- **Cause:** the replay board's height was a guess, `calc(100svh − 13rem)`, about 40px
  short of the real chrome around it (top nav, card padding and borders, toolbar row).
  So the page came out slightly taller than the screen.
- **Fix:** new `lib/layout/useFillViewportHeight.ts` **measures** the space instead. It
  takes the screen height minus what's above the board panel and what's below it, and
  re-measures on resize and layout changes.
  - The board now fills exactly the rest of the screen and scrolls inside.
  - The page doesn't scroll.
  - The details sidebar is capped to the same height.
- `SidePanel`'s `viewportOffset` prop became `maxHeight` (px or any CSS length).

See `feat-diary.md`.

## 2026-10-03 — Diary replay board fills the screen height and scrolls

- **Height:** the desktop replay board is now exactly screen-height. Its bottom lines up
  with the day-details sidebar.
- **Scroll:** it scrolls inside, both directions in one scroll box, when the columns are
  taller or wider than that.
- **Fix:** the scroll box is marked `layoutScroll` for Motion, so cards still glide from
  the correct place after you've scrolled. This was already latent with horizontal
  scrolling on many columns.
- **Padding:** the board's padding moved *inside* the scroll box (`p-6`). There is room
  on every side, including at the scrolled ends, and the scrollbars sit flush with the
  panel border.

See `feat-diary.md`.

## 2026-10-03 — Sidebar toggles move to the Diary toolbar as ☰ buttons

The «/» collapse buttons floated in the gap beside each sidebar. They looked misaligned
and moved between the open and closed states. Collapsing also left a thin border line and
an empty gap behind.

- **New toggles:** two ☰ `SidebarToggle` buttons in the Diary header:
  - far left: the Apps list (both Diary pages);
  - far right: day details (day page only).

  They are square ink-bordered like the other toolbar controls, and ink-filled while
  their sidebar is open.
- **`SidePanel` changes:**
  - it no longer has its own button;
  - collapsing now animates it to exactly zero width and closes the gap beside it (the
    panel owns the gap as a margin), so nothing is left behind.
- **Shared state:** toggle and panel share state through a small store in
  `lib/storage/panelLayout.ts` keyed per sidebar. It is still remembered across reloads.

See `style-guide.md` and `feat-diary.md`.

## 2026-10-03 — Desktop: collapsible, resizable sidebars; height fix in the Diary

New `components/ui/SidePanel.tsx`, used for the Apps list and the Diary's day-details
sidebar:

- **Collapse/expand** with a small square «/» button in the gap beside each sidebar. The
  width animates, and the content doesn't re-wrap.
- **Drag the inner edge to resize.** Keyboard ←/→ also works, and a double-click resets.
- **Remembered:** width and collapsed state are saved per sidebar
  (`lib/storage/panelLayout.ts`). It uses synchronous `localStorage` instead of async
  Preferences, so the saved width is there on first paint with no jump. These are
  desktop-only, where Preferences is `localStorage` anyway.
- **Height fix:** sidebars are capped to the screen height, stay in view while the page
  scrolls, and scroll internally. Before, a busy day's change list stretched the Diary
  page.
- **Re-expand:** clicking a card in the replay re-expands a collapsed details sidebar.

Settings' sidebar is unchanged, because the behaviour is opt-in through
`SidebarPanelLayout`'s `sidePanel` prop. See `feat-diary.md` and `style-guide.md`.

## 2026-10-03 — Phase 2.8: Diary

Apps → Diary is built. It is a workspace history: a month calendar of activity, and per
day a smooth board replay (desktop) or a summary of changes (mobile).

- **Calendar** (`/apps/diary`, both platforms):
  - react-day-picker v9 styled with the app's tokens (no library CSS): square ink-border
    cells, today in yellow, yellow square ‹ › month buttons;
  - each day shows `+` created, `↔` moved and `✎` changes chips.
- **Day** (`/apps/diary/:date`):
  - **Desktop:** a Radix scrubber (one stop per change, ticks, Play/Pause, a yellow round
    thumb per the wireframe) drives a read-only board animated with Motion. Cards glide
    between columns on a move and fade in or out on create or delete, interruptibly, so
    fast scrubbing stays smooth. Frames are precomputed, so dragging never queries
    SQLite.
  - **Desktop sidebar:** the day's counts and change list; click an entry to jump to it,
    or click a card for that note's changes.
  - **Mobile:** no scrubber, just the counts and change list; tap an entry to open the
    note.
  - The ‹ › day stepper moves between days.
- **Data:**
  - new append-only `activity_events` table, logged inside every note/group write,
    including drag moves, group-delete cascades and the seed;
  - a one-time backfill from existing rows, so past days aren't empty (it can't recover
    past moves or renames);
  - new `workspaces.completed_group_id`, set in Settings → Groups as "Completed Group".
- **Note cards:** gained a `readOnly` mode.
- **Bundle:** Diary routes are lazy-loaded, so the new libraries (react-day-picker,
  date-fns, Motion, Radix Slider) don't grow app start-up. The main bundle is about
  477 kB.

See `feat-diary.md`.

## 2026-10-03 — Fix: glitchy note-card morph; search gets a fade

- **"Doesn't morph the first time" fixed:**
  - After closing a note, its board card kept the shared `note-morph` name, because
    React re-applied it at render. `clearNoteMorph()` only removed names it had set by
    hand.
  - Tapping a *different* card therefore produced two elements with the same
    `view-transition-name`, and the browser aborts the transition when that happens.
  - It now strips the name from every element that has it.
- **Counter, list and status cards no longer glitch:**
  - The morph used to stretch a screenshot of the card into the editor's
    title/description card, and their contents don't match.
  - It is now a plain block in the note's sticky colour with the hard card shadow,
    growing from the card to the editor card. Content only fades (out early, in late),
    never stretches, so all note types morph the same way.
  - The colour follows edits made in the editor.
- **Ready-gate cap** raised from 400 to 500 ms for cold first reads.
- **Search** (board and Diary search icons) now opens with the fade, and fades back.

See `feat-navigation.md` ("Page transitions").

## 2026-10-03 — New page-transition system; circle reveal removed

The feathered circle reveal was removed. It was soft and round against an otherwise
hard-edged, paper-like UI. In its place is one transition vocabulary chosen by the kind
of navigation, with back animating in reverse:

- **Opening a note** (mobile and web): the tapped card morphs into the editor's note
  card, and morphs back on the way out.
- **"+" into the editor:**
  - mobile: a paper sheet slides in from the right with a hard 3px ink edge, while the
    board recedes and dims; it slides back off on the way out;
  - web: a quick fade-rise.
- **Bottom-nav tabs** (mobile): a short directional slide in tab order. **Top-nav**
  (web): fade-rise.
- **Back** (Android back, browser back, leaving the editor): the reverse of whatever
  opened it, using React Router's POP replay of view transitions.
- The bottom and top navs stay still while pages move under them. Re-tapping the
  current tab doesn't animate. Reduced motion turns all of it off.

How it's built:

- New `lib/motion/pageTransitions.ts`:
  - a router subscriber picks the kind from the from→to paths and sets
    `<html data-pt>`;
  - a ready gate holds the browser's "after" snapshot until the board or editor has
    loaded its data from SQLite (capped at 400 ms), so transitions never capture an
    empty page;
  - `useOpenNote`/`noteMorphName` manage the single shared morph name.
- CSS in `index.css`. It includes a forced `mix-blend-mode: normal` on page snapshots,
  because the browser's default `plus-lighter` washes overlapping sliding pages out to
  white.
- `useBoard` gained a `loaded` flag.
- `useCircleReveal.ts` and its CSS were deleted.

See `feat-navigation.md` ("Page transitions").

## 2026-10-02 — Circle reveal becomes a common tool: note cards and bottom nav too

- **Common tool:** `useCircleRevealNavigate` became `lib/motion/useCircleReveal.ts`, a
  shared hook with two helpers:
  - `linkClick(to)` for Links and NavLinks;
  - `revealTo(event, to)` for other click targets.

  It takes an `origin` option: `'element'` grows from the element's centre, `'pointer'`
  from the tap point. The mobile-only rule, reduced-motion and support checks, and a
  "skip if already on that page" check are all inside the hook, so callers don't
  repeat them.
- **New uses (mobile):**
  - opening a note from its card (basic, counter or list) grows from where you tapped;
    this also applies to search results, which reuse the cards;
  - the bottom nav's Home / Apps / Settings tabs grow from the tapped tab;
  - re-tapping the tab you're already on doesn't animate.
- Web is unchanged: everything there is a plain navigation.

See `feat-navigation.md` ("Circle-reveal transition").

## 2026-10-02 — Circle reveal: mobile only, with an ease-in-out

- **Web excluded:** web's per-column "+" no longer uses the circle reveal; it is a
  plain Link again (`GroupColumn.tsx` is back to how it was before the transition).
  Only the mobile floating "+" has it.
- **Easing:** the reveal now uses an ease-in-out (`cubic-bezier(0.65, 0, 0.35, 1)`)
  over 600 ms, instead of a fast-start ease-out over 480 ms. It starts gently out of the
  button and settles softly, so the easing is actually visible.

See `feat-navigation.md` ("Circle-reveal transition").

## 2026-10-02 — Feathered edge on the circle-reveal transition

The circle that reveals the new-note page now has a soft, 64 px feathered edge instead
of a hard cut. This needed a switch from `clip-path`, which can only cut hard edges, to
a `radial-gradient` `mask-image`. The gradient's radius is animated through a registered
`@property --vt-r` (`<length>`), so the browser can interpolate it. See
`feat-navigation.md` ("Circle-reveal transition").

## 2026-10-02 — Circle-reveal transition from the add-note buttons

Tapping an add-note button now opens the new-note page through a circle that grows out
of that button. This applies to web's per-column "+" and the mobile floating "+".

- It is built on the View Transitions API: the board stays still while the new page is
  revealed through an expanding `clip-path: circle()`, over 480 ms with an ease-out.
- The origin is read from the button's live on-screen position at tap time, so it
  follows the column, the High/Medium/Low setting, and whether the mobile button is
  shrunk.
- It falls back to normal navigation without View Transitions support, under
  reduced motion, or for Ctrl/⌘-click.

New file: `lib/motion/useCircleRevealNavigate.ts`; the CSS is in `index.css`. Also
fixed a formatting slip in `index.css`: two `@theme` tokens had ended up on one line.
See `feat-navigation.md` ("Circle-reveal transition").

## 2026-10-02 — Floating "+" position setting, and tilt down wakes it

- **Position:** a new "Add Button Position" setting in Settings → Board (High / Medium /
  Low) puts the button's centre at 30%, 50% (default) or 70% of the screen height. It is
  applied with `top`, not a transform, so the idle shrink can't make it jump.
- **Tilt-down wake:** tilting the phone's bottom edge down more than 12° now also
  springs a shrunk button back to full size, alongside tilt-left. The 1.7 s lock after
  a tilt-right tuck still applies.
- `useTiltAddButtonSetting` became `useAddButtonSettings` (both settings).

See `feat-navigation.md` ("Position", "Dynamic Add Button").

## 2026-10-02 — Floating "+" no longer slides up and down

The tilt-to-slide movement was too much, so it's removed. The button now stays at its
fixed spot, and only its size changes:

- it still shrinks after 8 s idle;
- it still wakes when you tilt the phone left;
- it still tucks away when you tilt the phone right, with the 1.7 s wake lock.

Removed with it:

- the vertical-tilt (`beta`) reading;
- the slide physics;
- the haptic thud at the top and bottom;
- the Short / Medium / Long "Slide distance" setting (its stored key is simply no
  longer read).

`lib/motion/useTiltSlide.ts` is replaced by the smaller `lib/motion/useTiltShrink.ts`,
and `FloatingAddButton`'s `tiltToMove`/`tiltMaxFraction` props became one `dynamic`
prop. The "Dynamic Add Button" on/off setting keeps its stored value. See
`feat-navigation.md` ("Dynamic Add Button"); the old slide code is in git history at
`e1d9832`.

## 2026-09-30 — Tilt right to tuck the floating "+" away

Rolling the phone right (more than 12°), while the "+" is full size and not sliding,
shrinks it immediately. Small vertical drift doesn't count as sliding. For the next 1.7 s
nothing wakes it, neither sliding nor tilting left. It's edge-triggered, so holding the
phone rolled right doesn't keep re-tucking it. See `feat-navigation.md`
("Tilt to move" → Manual tuck).

## 2026-09-30 — Haptic feedback on every button and checkbox (mobile)

A new app-wide `useTapHaptics` hook, mounted once in `App.tsx`, adds haptic feedback on
native:

- Every button, link, tab and switch gives a light tap.
- Checkboxes give a medium tap when checking and a light one when unchecking.
- It is one delegated `click` listener rather than per-component code, so future
  buttons get it for free.
- `data-haptic` overrides the strength, or silences it with `none`.
- The floating "+" moved from its own `onClick` haptic to `data-haptic="medium"`.

See `feat-navigation.md` ("Tap haptics").

## 2026-09-30 — Haptics on the floating "+"

Added `@capacitor/haptics`, used through a new native-only wrapper,
`lib/platform/haptics.ts`. The floating "+" now gives haptic feedback when you:

- tap it (medium);
- see it spring down to idle (light) or back up to full size (medium);
- slide it all the way to the top or bottom point (one thud per arrival, heavy or
  medium depending on speed, with no repeat from bouncing or holding it there).

Sliding itself has no haptic: per-distance ticks were tried and removed as too busy. See
`feat-navigation.md` ("Tilt to move" → Haptics).

## 2026-09-30 — Fix: floating "+" jumped vertically when shrinking

The idle shrink animated the CSS `scale` property while the tilt position was in
`transform: translate3d(…)`. CSS applies `transform` inside `scale`, so the slide offset
was scaled too: shrinking to 60% moved the button up to 60% of its offset. Position now
uses the individual `translate` property, which sits outside `scale`, so shrinking only
changes size. See `feat-navigation.md` ("Tilt to move").

## 2026-09-30 — Mobile: tilt the phone to slide the floating "+"

The mobile `FloatingAddButton` now slides up and down as the phone tilts, like a
physical object:

- Dipping the phone's bottom edge moves it down, to at most 2/6, 3/6, or 4/6 of the screen height. You choose which in Settings → Board's
  "Slide distance" row, shown as Short / Medium / Long; the default is Medium (3/6).
  Tilting the other way moves it back up.
- It has inertia and friction, so it eases in, eases out, and stays wherever it
  stops.
- Small tilts (under 4°) are ignored. "Level" is learned from how you are holding the
  phone.
- It can be turned off in Settings → Board. It is also off when the OS "reduce motion"
  setting is on or the phone is in landscape.

After 8 s with no movement it springs down to 60% size. It springs back when it moves
again or when the phone is rolled left, and then the 8 s countdown restarts.

The physics is in `lib/motion/useTiltSlide.ts`, and the preference is in
`lib/storage/preferences.ts`. See `feat-navigation.md` ("Tilt to move").

## 2026-09-29 — Phase 2.7: Power Tools → Settings, new Apps tab, mobile floating "+"

Nav and shell changes from `docs/phase2-apps-diary-plan.md` §2.7, built from the new
wireframes (`docs/design-references/web/diary*.png`, `mobile/newuiapps.png`):

- **Power Tools is now "Settings"**, both the visible label and the route: `/settings` and
  `/settings/groups/:id`. The old `/power-tools*` paths redirect with `replace`. The
  **Addons tab was removed** because Pomodoro moved to Apps, so Settings is now Groups +
  Account & Sync. Internal names (`PowerToolsPage`, `PowerToolsSidebar`) are unchanged.
  See `feat-power-tools.md`.
- **New Apps nav item** (`/apps`, `/apps/diary`). On web it is a 2-panel sidebar (Diary,
  plus Pomodoro greyed out); on mobile it is a list of tiles. Diary shows a placeholder
  until 2.8. The desktop sidebar markup was extracted into a generic
  `components/SidebarPanelLayout.tsx`, which Settings and Apps now share. See
  `feat-apps.md`.
- **Navs:** the web `TopNav` shows Home / Settings / Apps. The mobile `BottomNav` shows
  icons only (Home / Apps / Settings) and no longer has the "+".
- **Mobile quick-add** is now `components/ui/FloatingAddButton.tsx`, a purple bell-curve bump (the exact shape from the Penpot export, in the app's own purple) on
  the right edge of the board. It adds to the active tab's group, which is the same
  target the old bottom-nav "+" used. It is hidden during a note drag and when there are
  no groups. The web per-column "+" is unchanged. See `feat-navigation.md`.

## 2026-09-22 — Fix: long marquee status text broke layout with page-level horizontal scroll

`NoteStatusStrip.tsx`'s hidden overflow-measurement `<span>` (`position: absolute`, used
so a long status's un-wrapped width can be compared against its container without ever
painting it) had no `relative` ancestor — it escaped to the document's initial
containing block instead of being scoped to its own `overflow-hidden` container.
`visibility: hidden` still occupies layout space, so a long status inflated the whole
page's scrollable width, most visibly on narrow (mobile) viewports. Fixed by adding
`relative` to the strip's own container so the span is clipped locally, as intended.
Confirmed via a direct before/after `scrollWidth` comparison (1199px vs. 430px on a
390px-wide viewport for the same long status) — 430px is the pre-existing, unrelated web
multi-column board's own intentional horizontal scroll, not a regression. See
`docs/feat-notes.md` ("Statuses" → "Board rendering").

## 2026-09-22 — Fix: multiline status text didn't fully display in the note editor

The existing-status `<textarea>` in `NoteEditorPage.tsx`'s Status block sat inside a
`flex-col` wrapper (added to also hold the timestamp caption underneath it) and carried
`flex-1` — but in a column-direction flex container, `flex-1` (`flex: 1 1 0%`) governs
the item's *height*, which fights the manual autoGrow-via-inline-height technique: the
flex algorithm collapses a `flex-basis: 0%` item back toward min-content height
regardless of the inline `height` autoGrow sets, when the container's own height is
otherwise auto/intrinsic. A multi-line status therefore rendered clipped to one line
even though its full text was present in the DOM. `list`-type items never hit this,
since their row is a `flex` *row* (not column) — `flex-1` there governs width, not
height, so it never fought the height-based autoGrow. Fixed by swapping `flex-1` →
`w-full` on the status textarea (it doesn't need vertical flex-grow at all — its height
is entirely content-driven). See `docs/feat-notes.md`.

## 2026-09-22 — Status strip/editor block polish pass: swatch-colored text, bold, dark editor background, slower marquee

Follow-up refinements to the per-note statuses feature shipped the same day:
- Board `NoteStatusStrip` text is now tinted to the note's own resolved swatch color
  (new `SWATCH_TEXT_CLASSES` in `swatchColors.ts`, the `text-sticky-*` counterpart to
  the existing `bg-`/tint variants) and `font-semibold`, instead of a fixed gray — ties
  the strip visually back to its card. Font size bumped `text-xs` → `text-sm` for
  legibility.
- The note editor's own Status add/edit block was reskinned to match: dark `bg-ink`
  background (same token the board strip uses, not the note's own swatch color like the
  adjacent list-items/counter-config blocks), with all text, timestamps, and the
  add/remove icons tinted to the note's swatch color and bold (new
  `SWATCH_PLACEHOLDER_TEXT_CLASSES` in `swatchColors.ts` for the "New status" input's
  placeholder; the add button's border uses `border-current` rather than a new
  border-color map, since its color already matches the icon glyph).
- `ListNoteCard`'s status strip now width-matches the checklist body directly above it
  (`ml-4`-indented, narrower than the card) instead of spanning the full card width —
  reads as one continuous edge with the notch shape instead of protruding past it.
- Marquee animation duration doubled (`10s` → `20s`, same distance covered, half the
  speed) per user feedback that the original pace was too fast to comfortably read.

See `docs/feat-notes.md` ("Statuses").

## 2026-09-22 — Add per-note statuses, with a latest-status marquee strip on the board

Notes can now carry multiple free-text "status" entries (`NoteStatus { id, text,
createdAt }`), each showing when it was created — a new `notes.statuses` DB column
(`TEXT NOT NULL DEFAULT '[]'`, added via `migrateSchema()`'s `ensureColumn` pattern,
same as `groups.reset_on_move`) parallel to but separate from `payload`, since statuses
apply to all three note types, not just `list`. The note editor
(`NoteEditorPage.tsx`/`useNoteForm.ts`) gets full add/edit-in-place/delete CRUD for
statuses, listed newest-first, reusing the exact always-editable-textarea/trim-on-blur/
empty-deletes convention `list`-type items already use — gated behind an existing
(non-new) note, same as the Delete button. On the board (and search results, which
reuse the same card components), a note with any statuses shows only its latest one
(`lib/notes/noteStatus.ts`'s `getLatestStatus`) as a new `NoteStatusStrip` — a full-width
dark (`bg-ink`) footer strip on `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard`, static
and right-aligned when it fits on one line, auto-scrolling (`.animate-marquee` in
`index.css`, the app's first CSS keyframe animation) when it doesn't. See
`docs/feat-notes.md`'s new "Statuses" section.

## 2026-09-13 — Onboarding via seeded Todo notes instead of an intro image modal

Replaced the first-run intro image modal (`IntroModal.tsx`/`useIntro.ts`, `intro.png`/
`intro-mob.png`) with three seeded notes in the first-run Todo group instead —
in-context walkthrough beats a dismissable popup. `seedIfEmpty` (`src/lib/db/sqlite.ts`)
now inserts, right after creating the three default groups: a yellow "Click to edit
me" (description "Edit Title , Note Type & color "), a coral note explaining the
check-to-move-along / drag-and-drop flow (walks the Todo → In Progress → Completed
chain wired below), and a green "Try \"POWER TOOLS\" for advanced behaviour edits".
All basic-type, unchecked, `manual`-color. The intro modal
code, its Preferences flag, and its `App.tsx` mount were removed entirely — it never
shipped past this session. See `docs/feat-groups.md`.

## 2026-09-13 — First-run seed groups now chain Todo → In Progress → Completed on check

`seedIfEmpty` (`src/lib/db/sqlite.ts`) pre-generates the three default groups' ids so it
can wire "On Check Move To" between them: checking a note in Todo moves it to In
Progress and resets it to unchecked (it isn't done yet, just moved along); checking a
note in In Progress moves it to Completed *without* resetting, since that check meant
the work was actually finished. Completed has no move target. Previously the seeded
groups had no move rule at all — a new user had to configure this manually per group.
See `docs/feat-groups.md`.
## 2026-09-13 — Fix: workspace delete button did nothing on web

`WorkspaceSwitcher.tsx`'s outside-click listener closed the whole switcher (resetting
`confirmingDeleteId` to `null`) on any `document` `pointerdown` outside its
`containerRef` — but the delete `ConfirmDialog` renders through `Modal`'s
`createPortal(..., document.body)`, so its own Confirm/Cancel buttons live outside
`containerRef` too. `pointerdown` fires before `click`, so clicking "Delete" unmounted
the dialog before its `onConfirm` could run — the button appeared to do nothing, and
`deleteWorkspace` never fired. Native was unaffected (that listener is web-only).
Fixed by skipping the outside-click check while `confirmingDeleteId` is set.
## 2026-09-13 — Dim the disabled color picker in `priority`-mode notes, add an explanatory callout

Reverses a prior design decision (`style-guide.md` used to say `SwatchPicker`'s
disabled state was deliberately never dimmed with opacity, only `pointer-events-none`)
— per updated design feedback, the disabled swatch picker in a `priority`-mode note now
also gets `opacity-35` so it visually reads as non-interactive. `NoteEditorPage.tsx`
also gains a small bordered/tinted callout directly under the Color field (`mt-2.5` gap
above it), shown only when the owning group's `noteColorMode === 'priority'`: "Color is
set by priority for this group." Its background is tinted to match the note's own
resolved color via the new `SWATCH_TINT_CLASSES` map in `swatchColors.ts` (each swatch
at 15% opacity) rather than a fixed accent color. See `docs/style-guide.md` and
`docs/feat-notes.md` ("Color resolution").

## 2026-09-13 — Fix: note editor showed the raw manual color, not the priority color, in `priority`-mode groups

The color picker on the note detail/editor screen was already correctly disabled for
`priority`-mode groups, but its highlighted swatch and the card's background color
still read the raw `note.color` instead of the priority-derived color every other
surface (board cards, search results, `HomePage`) already shows via
`resolveNoteColor(note, group)`. `resolveNoteColor`'s parameter type was widened from
`Note` to `Pick<Note, 'color' | 'priority'>` so `NoteEditorPage.tsx` — which holds
these as separate form fields rather than an assembled `Note` — could call it too;
`colorClass` and the `SwatchPicker`'s `value` now both come from it, so they update
live as the Priority dropdown changes. See `docs/feat-notes.md` ("Color resolution").

## 2026-09-13 — New groups default to Manual/None/Manual; Note Colors' Random mode folded into Manual

New groups (`createGroup` in `src/lib/db/groups.ts`, and the first-run seed groups in
`sqlite.ts`'s `seedIfEmpty`) now default to `sortedBy: 'manual'` and
`noteColorMode: 'manual'` (previously `'alphabetical'`/`'random'`), matching the intended
default shown on a fresh Group Settings screen; `onCheckMoveToGroupId` was already
`null` by default. Separately, `NoteColorMode`'s `random` option was removed and folded
into `manual`: `manual` now auto-assigns a random swatch when a note is created (as
`random` used to) *and* leaves the color picker enabled so the user can change it
afterward (as `manual` used to) — previously these were two mutually exclusive modes,
one auto-colored-and-locked and one blank-and-editable. A schema migration in
`migrateSchema` rewrites any existing `note_color_mode = 'random'` rows to `'manual'`
so older local databases keep working under the narrowed type. See `docs/feat-groups.md`
("Group Settings") and `docs/feat-notes.md` ("Color resolution").

## 2026-09-13 — Every confirm dialog in the app gets the frosted-dim + deep-shadow look

`ConfirmDialog.tsx` now passes `Modal`'s `overlayClassName`/`panelClassName` with the
same `bg-white/60 backdrop-blur-sm` overlay and `shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]`
panel shadow `WorkspaceSwitcher` introduced — since every destructive confirmation
(note delete, group delete, workspace delete, Reset to Default) goes through this one
component, they all pick it up automatically. `Modal`'s own defaults are unchanged for
any future consumer that doesn't opt in. See `docs/style-guide.md`.

## 2026-09-13 — Fix: workspace switcher trigger's elevated z-index broke stacking everywhere else

Follow-up to the entry below. The `z-[60]` given to the "Workspace ▾" trigger was
applied unconditionally, not just while its own popup was open — so it sat above *any*
unrelated modal/dialog elsewhere in the app (any platform, since z-index governs
stacking against whatever spatially overlaps it, popup open or not) any time that
trigger happened to be mounted behind one. Made it conditional on `isOpen`, so the
elevated stacking only exists during the brief window the switcher's own frost is
actually showing.

## 2026-09-13 — Fix: workspace switcher trigger was getting blurred by its own frosted overlay

Follow-up to the entry below. The "Workspace ▾" trigger button had no elevated
stacking, so the new frosted backdrop painted over/blurred it too while open —
looked wrong, since it's the one thing that should stay sharp. Gave it `relative
z-[60]`, above both the desktop overlay (`z-40`) and the mobile `Modal`'s portalled
overlay (`z-50`, where a tied `z-50` would've depended on DOM/portal order instead
of being reliable). See `docs/feat-workspaces.md`.

## 2026-09-13 — Workspace switcher: frosted-white dim + deeper shadow, both platforms

Opening the workspace switcher now dims the background with a frosted white
blur-and-tint (`bg-white/60 backdrop-blur-sm`) instead of the app's usual dark
`Modal` overlay, and the switcher panel itself gets a deeper offset shadow
(`shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]`) than the standard `shadow-card` token —
meant to feel like it lifts further off the page, on desktop's dropdown and mobile's
bottom sheet alike. `Modal.tsx` gained optional `overlayClassName`/`panelClassName`
props (full replacements, not additions, for its default dark overlay/`shadow-lg`
panel) so only this one consumer opts into the look — every other `Modal` use
(delete confirmations, auth) is unchanged. See `docs/feat-workspaces.md`.

## 2026-09-13 — Fix: workspace switching was nearly impossible to click after the redesign

Follow-up to the entry below. Making the workspace name itself a directly-editable
`<input>` (to mirror Group Settings' rename field) meant that element's clickable area
covered almost the entire row, leaving "click to switch" a tiny, hard-to-hit sliver
around it — caught immediately when actually trying to switch workspaces. Fixed by
reverting the name to a plain button (single click = switch) and adding a small pencil
icon per row that enters an autofocused, autosave-on-blur rename for just that row
(`editingId` local state in `WorkspaceSwitcher.tsx`). See `docs/feat-workspaces.md`'s
"Switcher UI" section for the full before/after.

## 2026-09-13 — Workspace switcher redesigned to match the board/Power Tools chip style

`WorkspaceSwitcher.tsx` moved off its original plain-white `shadow-lg` dropdown look
onto the same `border-ink`/`shadow-card` row-chip system as Power Tools/Groups. See
`docs/feat-workspaces.md`'s "Switcher UI" section.

- Rename is now directly inline (type in the row, autosave on blur/Enter) instead of a
  "Rename" link that swapped the row into a separate input with Save/Cancel buttons —
  matching the same pattern `GroupSettingsPage.tsx`'s name field just adopted.
  `useWorkspaceSwitcher.ts` lost the whole `renamingId`/`renameValue`/`startRename`/
  `cancelRename`/`confirmRename` state machine in favor of one `updateName(id, name)`.
- Delete switched from a text "Delete" link to a "×" icon (matching the Groups list),
  and its confirmation switched from a bespoke content-swap of the open panel to the
  shared `ConfirmDialog` component used everywhere else destructive actions live.
- Desktop's dropdown panel is now a `border-neutral-300 bg-surface shadow-card`
  backdrop card (matching `GroupColumn`/`TopNav`/`PowerToolsDesktopLayout`) instead of
  a plain white `shadow-lg` box.

## 2026-09-13 — Groups can now be renamed, inline from Group Settings

Previously deliberately out of scope (see the old "No group rename" note in
`docs/feat-groups.md`, now replaced). The group name heading in `GroupSettingsPage.tsx`
is now a directly-editable input, auto-saving on blur — no separate rename dialog, no
Save button, matching every other field on that page. `useGroupSettings.ts` gained
`updateName`; the DB layer needed no change (`updateGroup` already accepted `name`
generically). Empty/whitespace-only blur reverts to the current name rather than saving
one. See `docs/feat-groups.md`'s new "Group rename" section.

## 2026-09-13 — Power Tools desktop panels gained the board's backdrop-card treatment

Follow-up to the entry below: on desktop, the sidebar and the right panel were
floating their row chips/tabs directly on the `.bg-grid` background with no enclosing
surface, unlike the board's `GroupColumn`/`TopNav`. New `PowerToolsDesktopLayout`
(`components/PowerToolsSidebar.tsx`) wraps both in a `border-neutral-300 bg-surface
shadow-card` backdrop card — the same treatment, desktop-only; mobile is unaffected.
`PowerToolsPage`/`GroupSettingsPage` both render through it now instead of a bare
flex row. See `docs/style-guide.md`'s "Power Tools: row chips + desktop 2-panel
drill-down" section.

## 2026-09-13 — Power Tools redesigned: chip aesthetic + desktop 2-panel drill-down

`PowerToolsPage`/`GroupSettingsPage` moved off the original generic white-card
`shadow-lg` look onto the board's neo-brutalist chip system (`border-ink`,
`shadow-card`), built against a mobile mockup and a rough desktop wireframe. See
`docs/style-guide.md`'s "Power Tools: row chips + desktop 2-panel drill-down" and
`docs/feat-power-tools.md`.

- **Mobile**: unchanged structure (one scrolling page, then a separate full-page Group
  Settings screen), reskinned to chip rows under plain section headings, matching the
  two distinct mobile mockups.
- **Desktop**: gained a real structural change — a persistent left sidebar
  (new `components/PowerToolsSidebar.tsx`, 3 tabs: Groups/Addons/Account & Sync via
  `?tab=`) with a right panel that drills down into a selected group's settings, while
  `/power-tools` and `/power-tools/groups/:id` stay two separate routes underneath so
  back/forward and deep-linking keep working. No separate "Back" control in the detail
  view — the sidebar's own persistent "Groups" tab is the way back. Both page files
  gained a genuine `isNative` branch for this (a real navigation-model difference, not
  a CSS breakpoint).
- New `ClockIcon`/`BoxIcon` inline SVGs (Pomodoro / group rows), following the
  existing one-off-glyph convention rather than adding new PNG assets.
- Danger actions (Reset to Default, Delete This Group) switched from the shared
  `Button` `danger` variant to a page-local `DANGER_CHIP` class (adds the `border-ink`/
  `shadow-card` chip treatment) — `Button.tsx` itself wasn't changed, since it's used
  well beyond this page's aesthetic.

## 2026-09-13 — "Reset To Unchecked On Move" is now a per-group toggle (default on)

Follow-up to the entry below: the unchecked-on-arrival reset is now optional, not
forced. New Group Settings field "Reset To Unchecked On Move" (`on`/`off`, default
`on`), rendered **only** when "On Check Move To" targets a real group — meaningless
otherwise, so hidden rather than shown-disabled. Turning it off keeps a moved note
showing checked/done in its destination, restoring the pre-reset behavior on a per-
group basis.

- New `groups.reset_on_move` column (`INTEGER NOT NULL DEFAULT 1`). Since this schema
  has no version tracking (`sqlite.ts`'s `SCHEMA_SQL` is `CREATE TABLE IF NOT EXISTS`
  only), a plain schema-string edit wouldn't reach already-created local databases —
  added `migrateSchema()`/`ensureColumn()` (idempotent `ALTER TABLE`, guarded by a
  `PRAGMA table_info` check) as the first use of an actual migration step in this repo.
- `useGroupSettings.ts` gained `updateResetOnMove`; `GroupSettingsPage.tsx`'s new
  `Select` only renders inside the existing `onCheckMoveToGroupId` conditional.
- `applyOnCheckMove` now returns `{ destGroupId, reset } | null` (was `string | null`)
  so callers know whether the reset actually happened; `useNoteForm`'s `syncAfterMove`
  only mirrors the local unchecked-state reset when `reset` is true.

See `docs/feat-groups.md`'s Group Settings section and `docs/feat-notes.md`'s "On Check
Move To" section.

## 2026-09-13 — "On Check Move To" now resets the note to unchecked on arrival

Reported as: a note that auto-moves to its destination group was still showing checked
there. That was the original design (move a "done" note as-is), but the intended
behavior is Kanban-style — checking a note moves it to the next group as a fresh,
unchecked item, ready for whatever happens there next (and lets rule chains across
several groups actually fire, rather than needing a manual uncheck/recheck first).

- `onCheckMove.ts`'s `applyOnCheckMove` now also applies a `buildResetPatch`: basic/
  counter reset `completed` to `false` (value/target left alone for counters — only the
  checkmark resets); list resets every subtask's `completed` to `false`.
- `useNoteForm`'s `syncAfterMove` (renamed from `syncGroupAfterMove`) now also mirrors
  that reset into local `completed`/`payload` state, so a note editor left open across
  the move doesn't keep showing it as checked.

See `docs/feat-notes.md`'s "On Check Move To" section.

## 2026-09-13 — Fix: re-checking a note in the editor after an "On Check Move To" move used the stale source group's rule

Follow-up to the entry below. `useNoteForm` loads `group` once at mount and never
refreshed it — so checking a note in the editor (triggering a move), then unchecking
and re-checking it without leaving that editor page, would re-fire the *original*
group's move rule instead of the *destination* group's own rule (relevant once groups
chain: A moves to B, B moves to C). Unchecking itself was always already a no-op
(`applyOnCheckMove` only ever fires forward), so this only affected the immediate
re-check case. `applyOnCheckMove` now returns the destination group id on an actual
move; `useNoteForm` uses it (`syncGroupAfterMove`) to refresh local `group`/
`resolvedGroupId`. See `docs/feat-notes.md`'s "On Check Move To" section.

## 2026-09-13 — "On Check Move To" group rule is now functional

Previously a visible-but-disabled dropdown (deferred in the Phase 2 plan pending sync
semantics). Now: a group's Group Settings dropdown picks any other group in the same
workspace, and a note auto-moves there the moment it becomes fully checked (own
checkmark for basic/counter — counter's already folds in target-reached auto-complete —
or every subtask checked for a list note). One-directional: unchecking later never
moves it back. See `docs/feat-notes.md`'s new "On Check Move To" section and
`docs/feat-groups.md`'s Group Settings section for the full behavior.

- New `src/lib/notes/onCheckMove.ts`: `isNoteFullyChecked` (type-dependent "checked"
  definition) and `applyOnCheckMove` (fires the move on a false→true transition,
  appending the note to the end of the destination group).
- Wired into every place a note's checked-ness changes: `BasicNoteCard`/
  `CounterNoteCard`/`ListNoteCard` (board + search results) and `useNoteForm`'s
  `toggleCompleted`/`toggleItem` (note editor).
- `useGroupSettings.ts` gained `siblingGroups` (same-workspace groups, excluding the
  current one) and `updateOnCheckMoveTo`; `GroupSettingsPage.tsx`'s dropdown is no
  longer hardcoded/disabled.

## 2026-09-13 — Board: checklist item checkbox now top-aligns on wrapped subtasks

`ListNoteCard.tsx`'s per-item row used `items-center`, so a long subtask that wraps
across several lines (now possible after the previous entry's multiline editing
support) centered the checkbox vertically against the whole wrapped block instead of
aligning it with the first line — inconsistent with `BasicNoteCard`/`CounterNoteCard`,
which both use `items-start` for their checkbox row. Switched to `items-start` (with a
small `mt-0.5` on the checkbox to match its first line optically), consistent with
every other note-card checkbox in the app.

## 2026-09-13 — Subtask items are directly editable, with multiline support

List-note checklist items could previously only be added/toggled/removed, never
edited — fixing a typo meant deleting and re-adding the item. See
`docs/feat-notes.md`'s "Create/edit" section for the full behavior.

- `common_logics/useNoteForm.ts` gained `updateItemText(id, text)` (local-state-only,
  called on every keystroke) and `handleItemTextBlur(id)` (trims and persists on
  blur; clearing an item's text and blurring deletes it, matching the note title's
  "empty = doesn't exist" convention).
- `NoteEditorPage.tsx`: each item's text is now an always-editable `<textarea>` (click
  in and type — same inline-edit pattern as the title/description, no separate edit
  mode), with multiline auto-grow via the same resize approach already used for
  title/description (extracted into a plain `autoGrow()` function since a dynamic
  list of items can't each call a hook). Item rows switched to `items-start` so
  wrapped text doesn't push the checkbox to the row's vertical middle.
- The "new item" input is now a multiline `<textarea>` too: Enter still adds the item
  (unchanged), Shift+Enter inserts a line break first so a multi-line subtask can be
  composed before submitting.

## 2026-09-13 — Mobile board remembers the active group tab across navigation

Fixed the mobile board's active group tab (the `Tabs`-switched single-column view)
resetting to the workspace's first group every time `HomePage` remounts — e.g. opening
a note and returning to Home via the Android hardware back button/edge-swipe gesture
added earlier. See `docs/feat-groups.md`'s new "Active tab survives navigating away
and back" section.

- `common_logics/useBoard.ts`'s `activeGroupId` now seeds from a module-level
  `lastActiveGroupId` instead of `useState(null)`, and every `setActiveGroupId` call
  writes through to it — `useBoard()` has exactly one call site (`HomePage`), so this
  needed no new Context or persistence layer. Deliberately in-memory only for this app
  session (resets on a full app restart/page reload), unlike the workspace selector's
  disk-persisted equivalent — not asked for here, and this fix already covers the
  reported case (and, as a side effect, every other path back to Home, not just the
  swipe gesture specifically, since the root cause wasn't gesture-specific).

## 2026-09-13 — Search page: desktop layout with a bento/masonry results grid

`SearchPage.tsx` had no desktop-specific layout at all — capped at `max-w-md` and a
single vertical list of results regardless of viewport. See
`docs/feat-search-filter.md`'s new "Desktop layout" section for the full behavior.

- Outer container widens to `lg:max-w-6xl` (matching `NoteEditorPage.tsx`'s
  convention); the search input, "Filter" toggle, filter panel, and group `Tabs` row
  keep the collapsible filter-toggle behavior unchanged from mobile. Folded in the
  filter panel's `shadow-lg` → `shadow-card` migration flagged as pending in
  `docs/style-guide.md`.
- Results switch from a single list to a bento/masonry grid at `md:`/`lg:`, since note
  cards vary a lot in height (list notes especially). Plain CSS `columns-2`/`columns-3`
  + `break-inside-avoid` per card, no new dependency — the container needed an
  explicit `md:block` alongside `md:columns-2`, since CSS `columns` has no effect on a
  `flex` container (the mobile-only base layout) without it.
- Follow-up: the search/filter cluster was initially constrained to a centered 3/4
  width, but that looked misaligned against the full-width results grid once seen
  together — widened it to match the grid's full width instead of narrowing the grid.

## 2026-09-12 — Android hardware back button / edge-swipe now navigates instead of exiting

Fixed Android's hardware back button and the right-edge swipe-back gesture exiting the
app from every page instead of stepping back through in-app navigation history. See
`docs/feat-navigation.md`'s new "Android hardware back button / edge-swipe" section for
the full behavior.

- New dependency: `@capacitor/app`. Its `backButton` event fires for both the hardware
  button and the Android gesture-nav back swipe (both funnel through the same
  `Activity.onBackPressed()` → Capacitor bridge event on a `BridgeActivity`), so one
  listener covers both. Without a JS-side listener, Capacitor's default behavior is to
  exit the activity outright rather than walk router history — nothing in the app
  previously registered one.
- New `src/lib/platform/useAndroidBackButton.ts` hook (native-only, gated on
  `usePlatform().isNative`): calls `window.history.back()` when the native event
  reports `canGoBack`, since the router (`createBrowserRouter`) already uses real
  browser history; otherwise — always Home, since the app boots at `/` — arms a ~2s
  "press back again to exit" window before calling `App.exitApp()`.
- New `src/components/ui/ExitToast.tsx`, the "Press back again to exit" confirmation
  banner, wired into `AppShell.tsx` globally so it's available on every route.

## 2026-09-12 — Note editor: swatch-colored items + desktop two-column layout

Fixed the note editor (`NoteEditorPage.tsx`) rendering checklist items and the
"new item" row as plain transparent boxes instead of picking up the note's
selected swatch color, and made the page use the extra width on desktop
instead of staying capped at a phone-width single column. See
`docs/feat-notes.md`'s "Create/edit" section for the current shape.

- The checklist items and the "new item" input are now one continuous
  swatch-colored block (`SWATCH_CLASSES[color]` background, `border-2
  border-ink`, `shadow-card`) wrapping all rows, rather than each item/the
  input having its own separate border and padding — matches the read-only
  `ListNoteCard.tsx`'s solid-color-block treatment instead of rendering with
  no background at all. The item remove "×" button moved from a hardcoded
  `text-sticky-coral` to `text-ink` so it stays legible regardless of which
  swatch color the note itself uses.
- `SwatchPicker.tsx`'s disabled state (shown when a group's `noteColorMode`
  isn't `manual`) no longer dims the swatches to `opacity-50` — the four
  colors always render at full opacity; disabling is communicated purely by
  the buttons not responding to input.
- `NoteEditorPage.tsx`'s outer layout gained an `lg:` breakpoint that splits
  it into a 40/60 two-column grid on wide/desktop viewports (left: title/
  description + items/counter-config, right: type/color/priority/delete),
  capped at `max-w-6xl` rather than the much narrower `max-w-4xl` so it
  actually uses the available desktop width instead of sitting in a
  cramped centered column, while still not stretching edge-to-edge on very
  large monitors. Collapses back to the existing single column below `lg:`
  — same JSX for every platform, no `isNative` branch, since this is an
  ordinary responsive reflow rather than a platform difference. The two
  columns are vertically centered against each other (`lg:items-center`)
  with a wider `lg:gap-12` between them.
- Follow-up pass on the same page: the title is now a `textarea` that grows
  with content with no line cap (was a single-line `<input>` that silently
  overflowed/clipped long text — see `useAutoGrowHeight` in
  `NoteEditorPage.tsx`); the description grows the same way but caps at
  `max-h-[210px]` (~10 lines) and scrolls internally beyond that. The items
  block dropped its `border-ink` outline (kept `shadow-card`) and got a
  bigger `gap-4` between rows, with the checkbox now flush against the
  block's left edge (`pr-4`/no left padding, container `rounded-card` is
  `0px` per the design system so nothing clips). The "Add" control became a
  small square `+` icon button (`font-display`) instead of a full-width
  labeled `Button`. Counter-type notes now get the same swatch-colored
  config block as list notes, in the same left-column slot (was plain
  white fields in the right column).
- Third follow-up: the right column's controls (Note Type/Color/Priority/
  Delete) no longer stretch to fill the full 60% grid track — wrapped in a
  `mx-auto max-w-xs` inner block so they're horizontally centered within the
  track instead of spanning it edge to edge. The counter Step/Target inputs
  switched from a transparent background to `bg-white` (previously blended
  into the swatch-colored block behind them). The "new item" input gained
  `pl-3` so its text/placeholder isn't flush against the block's left edge
  the way the checkbox rows intentionally are.

## 2026-09-03 — Kanban drag-and-drop for the board

Added drag-and-drop to the board, native to each platform's interaction model rather
than one shared widget — see `docs/feat-groups.md`'s "Drag-and-drop" section for the
full behavior:

- New dependency: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- `lib/db/notes.ts`/`lib/db/groups.ts` gained `reorderNotes`/`reorderGroups` bulk
  position-reindex helpers (same `withDb` pattern as the existing CRUD functions);
  `common_logics/useBoard.ts` gained `moveNote`/`reorderGroups` actions that optimistic-
  update local state then persist.
- New `common_logics/useBoardDnd.ts` (sensors + `onDragEnd` routing, shared by both
  platforms) and `components/BoardTabStrip.tsx` (mobile-only tab strip, doubles as a
  sortable chip for group reordering).
- `GroupColumn.tsx` notes are drag-sortable when their group is `sortedBy: 'manual'`,
  and a plain (non-reordering) drag source in every other group so they can still be
  moved to a different group regardless of sort mode; always droppable (a note dropped
  into a non-manual group is appended, positioned by that group's own sort rule, not the
  drop point). Web's column header chip is itself draggable for column reordering.
- Mobile cross-group move went through a redesign after the first version (drag a note
  onto a tab, dwell to auto-switch) proved unreliably fussy on a real Android device —
  small multi-purpose touch target, custom geometry hit-testing, missing
  `touch-action: none` racing the WebView's native scroll. Replaced with
  `components/GroupDropTargets.tsx`: starting a note drag swaps the tab strip for a row
  of large "drop here" tiles (one per other group) using plain dnd-kit `useDroppable`
  collision detection — no custom timers or hit-testing. Also widened the touch
  sensor's activation tolerance (a resting finger drifts more than a mouse).
- On mobile, a successful cross-group note drop now switches the active tab to the
  destination group (`useBoardDnd`'s new `onNoteMovedToGroup` option, wired in
  `HomePage.tsx`) so the note's new location is immediately visible.
- Fixed vertical scrolling being completely broken on a group's note list on mobile:
  the note cards' `touch-action: none` (added for reliable touch drag) disabled the
  browser's native scroll for any touch starting on a card — nearly the whole list.
  Switched to `touch-action: manipulation`, which was sufficient all along since
  activation here is delay-based (long-press), not distance-based.
- Note: mobile's touch drag-activation behavior still needs a real device/emulator to
  verify (`npm run android`) — not exercisable from a resized browser window, per this
  repo's native-vs-web platform-detection rule.

## 2026-08-28 — Board & note-card visual rework (2.7)

Restyled the board/home screen to match a Penpot design export pixel-for-pixel, replacing
the earlier generic Tailwind-defaults look:

- New `--color-ink`/`--shadow-card` tokens and `--radius-card: 0px` (square corners) in
  `src/index.css`; `--color-sticky-*` repointed to the reference's exact hex values.
- `GroupPanel` extracted out of `HomePage.tsx` into its own `src/components/GroupColumn.tsx`,
  which now renders each column as a light backdrop card behind the notes with the header
  chip intentionally overlapping its top edge, and dropped the always-on progress bar (never
  shown in the reference's default view).
- `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` moved to the new hard-edged `shadow-card`
  treatment; `ListNoteCard` is now two stacked rectangles (title strip + indented checklist
  body) to match the reference's notched shape; `CounterNoteCard`'s `+`/`−` control reordered
  to match the reference.
- `TopNav` gained a matching backdrop card; `AppShell` gained `headerStart`/`headerEnd` slots
  so `HomePage` can merge the workspace switcher + search icon into the same row as the nav
  pill on web.
- `CheckCircle`'s checked-tick overlay reworked to a deliberately oversized, proportionally-
  positioned "stamp" (scales correctly at every call-site size); fixed a Tailwind preflight
  `max-width: 100%` clamp that was silently squashing the enlarged tick.

Full details, including two things that look like bugs but aren't (the group column's
negative-margin overlap, and the list note's two-piece shape) and the one real gotcha
(`max-w-none` needed on any oversized absolutely-positioned icon): `style-guide.md`.

## 2026-08-26 — Documentation pass

- Added per-feature docs: `feat-auth.md`, `feat-offline-data-layer.md`,
  `feat-navigation.md`, `feat-workspaces.md`, `feat-groups.md`, `feat-power-tools.md`,
  `feat-notes.md`, `feat-search-filter.md`, `style-guide.md`.
- Added this changelog.
- Updated `CLAUDE.md`: refreshed the architecture section for Phase 2 (it previously
  only described Phase 1's auth-only app), added the changelog-maintenance rule.

## 2026-08-26 — Verified native SQLite on a real Android device (`165f2c8` + on-device testing)

No code change — verification only, prompted because native SQLite behavior had never
actually been exercised (browser-based testing can't reach the native code path in
`lib/db/sqlite.ts`; `Capacitor.getPlatform()` is always `'web'` in a browser, by
design). Built + installed on a connected physical device, created data, force-stopped
and relaunched the app, confirmed data survived with clean `adb logcat` output. See
`feat-offline-data-layer.md`.

## 2026-08-26 — Phase 2.6: Search & filter (`1d7e17b`)

`useSearchFilter.ts` + `SearchPage.tsx`. Read-only cross-group search + Status/
Priority/Color filters over the active workspace's notes, reusing the note card
components from 2.5. See `feat-search-filter.md`.

## 2026-08-26 — Phase 2.5: Note CRUD + board rendering (`4da912b`)

The core CRUD surface: 3 note types (basic/counter/list), create/edit/delete, inline-
editable auto-saving editor, board rendering via `BasicNoteCard`/`CounterNoteCard`/
`ListNoteCard`. Added `resolveNoteColor` (manual/random/priority color modes) and
`counterLogic` (auto-complete-at-target). See `feat-notes.md`.

## 2026-08-26 — Phase 2.4: Group CRUD + Power Tools (`dbaa462`)

Real group management: board tabs/columns show actual groups, `GroupSettingsPage`
(Sorted By/On Check Move To/Note Colors/Delete), `PowerToolsPage` extended with Groups
list + Addon Tools + Reset to Default. Added the `ConfirmDialog` shared primitive once
destructive confirmations crossed 3 call sites, and `danger` as a `Button` variant. See
`feat-groups.md`, `feat-power-tools.md`.

## 2026-08-26 — Phase 2.3: Workspaces (`666e8ae`)

`WorkspaceContext` (mirrors `lib/auth/`'s 4-file shape) + `WorkspaceSwitcher` UI
(web: dropdown, mobile: bottom sheet) — no mockup existed for this, designed inline.
See `feat-workspaces.md`.

## 2026-08-26 — Phase 2.2: Guest-first routing (`80aa860`)

Dropped the forced auth gate on `/` — the app opens straight to the board for
everyone. Added the `/search`, `/power-tools`, `/notes/*` routes (as stubs, filled in
by later sub-phases) and `AppShell`/`TopNav`/`BottomNav` wiring. `ProtectedRoute`
stays in the codebase, unused, for Phase 3. See `feat-navigation.md`.

## 2026-08-26 — Phase 2.1 + 2.0: Offline data layer + design system (`165f2c8`)

Bundled together: the SQLite local data layer (`lib/db/{sqlite,workspaces,groups,
notes}.ts`, schema + CRUD + first-run seed) and the design system foundation
(self-hosted fonts, grid background, the `components/ui/*` primitive set:
`Select`/`Modal`/`CheckCircle`/`Tabs`/`SwatchPicker`/`ProgressBar`/`Icon`/`TopNav`/
`BottomNav`). See `feat-offline-data-layer.md`, `style-guide.md`.

## 2026-08-26 — Consolidated reference doc (`33b7349`)

Added `docs/Taskodoro-Project-Reference.md` and `docs/phase2-offline-first-plan.md` —
the planning docs Phase 2's sub-phases were built from.

## 2026-08-25 — `CLAUDE.md` + local test command (`79d9b8c`)

## 2026-08-25 — SSO: Android (`e62dcad`) and Web (`37a03ea`)

Phase 1: manual email/password + Google Sign-In, on both platforms. At this point
`/` was gated behind `ProtectedRoute` — auth was mandatory to use the app at all, later
changed in Phase 2.2. See `feat-auth.md`.

## 2026-08-25 — Initial commit (`7cd4777`, `baf8556`)

Project scaffold: Vite + React 19 + TypeScript + Capacitor, Tailwind v4 design tokens.
