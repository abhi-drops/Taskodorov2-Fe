# Feature: Diary

Apps → Diary is a workspace-scoped history of the board: a month calendar of activity,
and for each day either a smooth replay of the board (desktop) or a summary of what
changed (mobile). Planned in `phase2-apps-diary-plan.md` §2.8 and built 2026-10-03
against the wireframes `docs/design-references/web/diary.png`, `diary_sidebar.png` and
`ui-to-code-reference/diarywithsidebar.html`.

## Screens

| Route | Desktop | Mobile |
|---|---|---|
| `/apps/diary` (`DiaryPage`) | Month calendar inside the Apps 2-panel layout | Same calendar, full page |
| `/apps/diary/:date` (`DiaryDayPage`, `yyyy-MM-dd`) | **Replay:** scrubber + read-only board + day sidebar | **Summary only:** counts + list of changes, no scrubber |

- **Calendar:**
  - each day cell shows small chips in the Diary colour scheme (below): violet `+N`
    created, blue `↔N` moved, yellow `✎N` changes;
  - "changes" is a rollup of title/colour edits, status entries and deletions;
  - days with no activity show no chips, and today is yellow;
  - the yellow square ‹ › buttons change month, and tapping a day opens it;
  - the viewed month is remembered while you're in and out of days (module variable in
    `useDiaryCalendar`).
- **Day header:** the book icon + "Diary", then (desktop only) the scrubber and the
  current frame's time, then the yellow ‹ › day stepper around the date.
  - Stepping days uses `replace`, so back still returns to the calendar in one step.
  - Tapping the date returns to the calendar.
  - › is disabled on today.
- **Desktop replay:**
  - The scrubber has **one stop per change**, with a tick per stop. Frame 0 is the start
    of the day. A day opens on the **last frame**, i.e. the board at the end of that day.
  - Play/Pause steps through at 700 ms per stop. Pressing Play at the end restarts from
    frame 0, and dragging pauses, like a video player.
  - The board is read-only group columns built from the real note cards in `readOnly`
    mode.
  - The sidebar shows the day's counts and the change list. The current change is
    highlighted, and changes still ahead of the scrubber are dimmed.
  - Clicking a list entry jumps to its frame.
  - Clicking a card swaps the sidebar to **that note's changes for the day**, with a ×
    to go back and an "Open note →" button if the note still exists. The button is
    full-width, square with an ink border and hard shadow, `font-display` uppercase, in
    sticky yellow, and presses down on click.
  - **Both desktop sidebars** (the Apps list on the left, day details on the right) are
    `SidePanel`s (see `style-guide.md`):
    - shown or hidden with **☰ buttons in the Diary toolbar** (`DiaryHeader`): the Apps
      list's toggle at the far left (both Diary pages), the day details' at the far
      right (day page only). The toggles are ink-filled while their sidebar is open;
    - collapsing the **day details** removes it completely, including the gap beside it,
      so the board takes the full width with no stray borders. Collapsing the **Apps
      list** leaves a slim icon rail at the content's height (see `feat-apps.md`);
    - resizable by dragging their inner edge, with width and collapsed state remembered
      (keys `APPS_PANEL_KEY` = `apps`, `DIARY_DETAILS_PANEL_KEY` = `diary-day-details`);
    - capped to the screen height with their own scrollbar, so a long day's change list
      no longer makes the page extremely tall. The day-details panel is capped to the
      board's **measured** height (below), so both end at the same line;
    - selecting a card re-expands a collapsed details panel (`openRequest`).
- **The change list** (`DiaryFeedList`, shared by the desktop sidebar and the mobile
  summary) renders each change from **structured fields** on `FeedEntry` (title,
  from/to group names, previous title/colour, status text, counter values and taps,
  item-level list changes, `resetOnMove`), not a pre-built string:
  - top line: a colour-coded **action chip** and the time. **The Diary colour scheme** is
    shared by action chips, count tiles and the calendar's day chips (constants at the
    top of `DiarySidebar.tsx`):

    | Colour | Kinds |
    |---|---|
    | violet (`accent-purple`, white text) | Created |
    | green | ✓ Checked, ✓ Completed |
    | yellow | content updates: Counter, Renamed, Color, List, ○ Unchecked |
    | black with yellow text | Status |
    | blue | Moved |
    | coral | Deleted |

    Moves or creations into the Completed group also get a green **✓ Completed** chip;
  - the note's **title in bold** (struck through for deletions);
  - a visual detail line per kind:
    - **Moved:** grey group chips, `[Todo] → [In Progress]`, plus "↺ reset to
      unchecked" when the move reset it;
    - **Created:** "in [Group]";
    - **Renamed:** "was ~~old title~~";
    - **Color:** before → after swatches;
    - **Status** (added): the text in the same dark strip notes use, in the note's
      colour;
    - **✎ Status** (edited): ~~old text~~ → new text in that strip;
    - **Status deleted** (coral chip): the removed text struck through in that strip;
    - **Counter:** `3 → 6` with the delta (`+3`). A merged burst has a separate
      "▸ Show N taps" toggle under the entry, listing each tap's time, value and delta.
      It's a separate button, so the entry stays one click target and buttons aren't
      nested;
    - **List:** one line per item change: ✓ checked, ○ unchecked, + added, − deleted
      (struck through), ✎ edited (~~old~~ → new);
    - **Checked / Unchecked:** no detail line; the chip says it.
  - `FeedEntry.text` keeps a plain, grammatical sentence of the same change as the
    entry's accessible name: curly quotes, "from X to Y", for example `Renamed “A” to
    “B”`.
  - Times use the device's own format (`formatTimeOfDay`, e.g. 3:53 PM or 15:53), like
    status timestamps elsewhere. The scrubber's frame 0 shows "Start".
  - UI wording is "Renamed" and "Color", matching the app's existing spelling. The old
    "Retitled"/"Recoloured" wording is gone.
- **Mobile summary:** the same count tiles and change list. The list sits in a "Changes"
  backdrop card (`border-neutral-300 bg-surface shadow-card`, like the group columns),
  not loose on the grid. Tapping an entry opens that note's editor, unless the note has
  since been deleted.

## Data: the activity log

The live tables only store *current* state, so the Diary reads an append-only
**`activity_events`** table. Schema and indexes are in `lib/db/eventLog.ts`
(`ACTIVITY_EVENTS_SQL`), created in `sqlite.ts`'s `initDb`.

- **Vocabulary (deliberately narrow):**
  - `created` / `deleted` for notes and groups;
  - `moved` (note `from_group_id → to_group_id`);
  - `field_changed` for a note's tracked fields. Encoding is in one place,
    `trackedNoteFields` (`eventLog.ts`), shared by create, update, backfill and
    catch-up:
    - `title`, `color`;
    - `completed`: `'1'`/`'0'`, checked/unchecked (added 2026-10-03);
    - `counter`: the counter's value (counter notes; added 2026-10-03);
    - `list`: a JSON snapshot of the items `[{ id, text, completed }]` (list notes;
      added 2026-10-03). The replay diffs consecutive snapshots into item-level changes.
    - `status` (added 2026-10-04): a status **edit** or **deletion**, as a
      `StatusEventValue` JSON (`op`, `id`, new/last `text`, `previousText` for an
      edit, and the status's own `createdAt`). Adding a status isn't logged, because
      each status already carries its `createdAt`. `updateNote` diffs the old and new
      `statuses` by id.
  - **Not** logged: description, priority, counter step/target. That keeps the log from
    becoming noise.
  - **Why statuses need edit/delete events:** before them, statuses were read only from
    `notes.statuses`.
    - **Deleting a status erased it from history:** its "added" entry and its presence
      on past frames disappeared.
    - **Editing a status rewrote the past:** old frames showed the new text.
  - `updateNote` compares the *encoded* values before and after, so only real changes
    log (e.g. editing a counter's step doesn't log a counter change). It logs `moved`
    **before** field changes from the same update, which the replay relies on to fold
    an automatic reset into the move.
- **Genesis values:** creating a note also logs every tracked field's starting value as
  `field_changed` at the *same timestamp* as `created`. That makes "X at time T" a
  single lookup. These are recognised by matching entity and timestamp (`genesisChecker`
  in `replay.ts`) and are never counted or shown as edits.
- **Catch-up for older logs:** `backfillTrackedStateIfMissing` (runs every start-up,
  idempotent) gives each note with no `completed` history a genesis value for
  `completed`/`counter`/`list`, using its *current* state at its *creation time*.
  - Creation time keeps them genesis, so nothing appears as a fake change today.
  - Without them, the first tracked change after the update would have no "from"
    value.
- **Where logging happens:** always inside the same `withDb` call as the write, so the
  log can't drift from the data.
  - `createNote`, `updateNote` (diffs old vs new; no event for a no-op save) and
    `deleteNote`.
  - **`reorderNotes`:** drag-and-drop between columns goes through this function, not
    `updateNote`, so it logs `moved` too.
  - **`deleteGroup`:** logs `deleted` for each note its cascade removes, then the group.
  - `createGroup`.
  - **`seedIfEmpty`:** so data re-seeded by "Reset to Default" has history even though
    the log isn't empty any more.
- **Backfill:** `backfillEventsIfEmpty` runs at start-up only while the table is empty,
  so it's idempotent. It runs *before* seeding.
  - Every existing note and group (including soft-deleted ones) gets `created` at its
    `created_at`, in its *current* group with its *current* title and colour, plus
    `deleted` at `deleted_at`.
  - **Limitation:** moves and renames from before the Diary existed were never recorded,
    so old days show creations, deletions and statuses only.
- **Completed Group:** `workspaces.completed_group_id`, set in Settings → Groups.
  - Notes created or moved into that group count as "Completed" for the day.
  - Unset means a count of 0, with no guessing.
  - It is read and written by `getCompletedGroupId`/`setCompletedGroupId` in
    `workspaces.ts`, not through the workspace context.

## Replay logic (`lib/diary/replay.ts`, pure, no React, no SQLite)

- `bucketMonth` gives per-day calendar counts.
  - Day bucketing is done **in JS with date-fns**, not SQL, because SQLite's
    `'localtime'` isn't reliable under sql.js/WASM on web.
  - It is one query per visible month (`getMonthActivity`), not per day.
- `buildDayReplay` works in three steps:
  1. It folds all history before the day into the starting board.
  2. It merges the day's events with its status entries into ordered steps.
  3. It **precomputes the board state for every frame**. Scrubbing then only indexes an
     array, which is what keeps it smooth: no database work during a drag.
  - Unchanged note objects are shared between frames.
  - Group created/deleted events change which columns exist but aren't stops of their
    own.
  - A new note's genesis fields are applied *with* its `created`, so it appears fully
    formed on its own frame.
  - **Counter bursts:** consecutive counter taps on the same note, each within
    `COUNTER_MERGE_MS` (60 s) of the last with no other step in between, are one change
    and one scrubber stop.
    - The entry keeps every tap (`taps`), and the list's "Show N taps" expands them,
      each with its time, value and ±delta.
    - Every tap is still in the log; only the display merges.
  - **List updates:** consecutive `list` snapshots are diffed by item id (`diffList`)
    into added / removed (shown as "deleted") / checked / unchecked / edited. A reorder-only update
    produces no entry, though the new order still applies to later frames.
  - **Reset on move:** On Check Move To with "reset on move" writes the move and the
    reset in one update. The reset's `completed`/`list` events share the move's
    timestamp and are folded into the move (`resetOnMove`, shown as "↺ reset to
    unchecked"), not listed as a separate uncheck.
  - `bucketMonth` applies the same burst merging, reset folding and reorder skipping,
    so the calendar chips agree with the day view. The one exception: a note's first
    list event in a month has no earlier snapshot in that query window, so it's counted.
- **Status history** (`buildStatusIndex`, `statusesAt`):
  - Every status ever seen per note is rebuilt from the current `notes.statuses` plus the
    `status` edit/delete events. Deleted statuses survive only through their delete
    event, which keeps their `createdAt` and last text.
  - A frame shows the statuses that existed at that moment (created by then, not yet
    deleted), each with its text *at that moment*: after the latest edit up to then,
    otherwise its original pre-edit text.
  - The feed lists an **added** entry at each status's `createdAt`, with its original
    text, even if it was deleted later. Edits and deletions get their own entries.
  - **Status events are loaded for all dates** (`listStatusEvents`), not just up to the
    viewed day: a status deleted next week was still there today. The main event list
    skips `status` events so they aren't double-counted.
- **Historical vs current fields:** group, title, colour, existence, statuses, **checked
  state, counter value and list items** are historical: replay cards show them as they
  were at each frame. Description, priority and counter step/target show their
  *current* values. Group names and order are current too, because renames aren't
  tracked.
- The logic was checked with a throwaway esbuild-bundled script against a hand-written
  event set covering:
  - a new note appearing fully formed, and a move changing its column;
  - statuses appearing only from their own frame onward, the retitle frame, and the
    delete removing the note;
  - the counts and the feed text;
  - unchanged notes being shared between frames;
  - genesis events not counting as calendar changes.

  A second script (20 checks) covers the checked/counter/list tracking, and a third
  (14 checks) covers status history: original text before an edit, a deleted status
  still listed as added, a status deleted on a later day still on today's frames, and
  the calendar rollup. The second script covers:
  - counter bursts merging, and splitting after a gap;
  - list diffs (checked, edited, added, deleted);
  - reorder-only updates skipped;
  - a reset folded into its move;
  - historical counter values, list ticks and checkmarks on frames;
  - the calendar rollup matching the day view.

  There is no test runner in this repo, so neither script is committed.

## Smooth scrubbing (desktop)

- **`components/ui/Scrubber.tsx`:** a generic Radix Slider, styled to the wireframe:
  - ink track, yellow round thumb, a tick per stop (hidden above 120 stops), and a
    Play/Pause button;
  - accessible, with arrow-key stepping and touch drag.
- **`components/DiaryReplayBoard.tsx`:** Motion does the "video" feel.
  - Every card has `layoutId={note.id}` in one `LayoutGroup`, so a move **glides** the
    card from its old column to its new one, and cards reflow smoothly.
  - `AnimatePresence` (`popLayout`) fades and scales cards in on create and out on
    delete.
  - **Gotcha:** a card that leaves a column because it *moved* would otherwise play a
    fading exit (a "ghost") in the old column while the real card glides to the new one.
    Its exit variant checks whether the note is still alive in the frame, through
    `AnimatePresence`'s `custom`, which keeps updating for already-exiting children. If
    it is still alive, the exit is instant.
  - Recolours cross-fade through the cards' `transition-colors`.
  - Springs use `bounce: 0`, so there's no overshoot (matching the style guide), and
    they're interruptible, so fast dragging never queues animations.
  - `MotionConfig reducedMotion="user"` disables it all under reduced motion.
  - The board is keyed by day, so switching days doesn't animate one day into another.
  - **The board fills exactly the rest of the screen and scrolls inside** (both
    directions, one scroll box), so **the page itself never scrolls**.
    - The height is **measured**, not guessed, by `lib/layout/useFillViewportHeight.ts`:
      the screen height minus the chrome above the board panel (its top) and below it
      (the document's length past its bottom edge).
    - It re-measures on resize and layout changes. Applying the height doesn't change
      that chrome, so the measurement is stable.
    - The details sidebar's `maxHeight` is the same number.
    - **Why not CSS:** a guessed `calc(100svh − 13rem)` came out about 40px short of the
      real chrome and gave the page a whole-page scrollbar. Any future change above or
      below the board would have broken it again.
  - **Padding sits inside the scroll box** (`p-6`, plus `pl-10` because each column's
    backdrop is pulled 1rem left under its chip). The board has room on every side,
    including at the scrolled ends, and the scrollbars sit flush with the panel border.
  - **Gotcha:** the scroll box is a `motion.div` with **`layoutScroll`**. Without it,
    Motion measures layout animations ignoring the scroll offset, so after scrolling,
    a gliding card would start from the wrong place and jump.
- **Read-only cards:** `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` take
  `readOnly` and `onSelect`. Their interactive parts (checkboxes, counter ±) become
  `inert`, so a replay can never write to the database. A click selects the card
  instead of opening the editor, and read-only cards never take the page-transition
  morph name.

## Loading and bundle

- Both Diary routes are **lazy** (`routes.tsx`). react-day-picker, date-fns, Motion and
  Radix would otherwise add ~270 kB to every app start. With lazy routes the main bundle
  stays at about 477 kB, and Diary loads its own chunks on first open. The chunks are
  local files bundled with the app, so it is still offline-first.
- Both pages call `useTransitionReady(loaded)` (page transitions' ready gate), so
  navigating in snapshots the loaded calendar or day, not an empty one.
- The routes sit under `/apps/*`, which page transitions treat as the Apps tab.

## Files

| File | Role |
|---|---|
| `lib/db/eventLog.ts` | Schema, `logEvent`/`logNoteCreated`/`logGroupCreated`, backfill (write side; no `sqlite.ts` import, avoiding a cycle) |
| `lib/db/events.ts` | Read queries: `getMonthActivity`, `getDayTimeline` |
| `lib/diary/replay.ts` | Pure counts, frames and feed |
| `common_logics/useDiaryCalendar.ts`, `useDiaryDay.ts` | Page hooks (month state; frames, frame, Play, selection) |
| `components/ui/Calendar.tsx` | Generic month grid (react-day-picker, its CSS not imported) |
| `components/ui/Scrubber.tsx` | Generic frame slider |
| `components/DiaryShell.tsx` | Shared chrome, header, calendar day chips |
| `components/DiaryReplayBoard.tsx` | Motion replay board |
| `components/DiarySidebar.tsx` | Count tiles + change list (desktop sidebar and mobile summary) |
| `pages/DiaryPage.tsx`, `pages/DiaryDayPage.tsx` | The two routes |
