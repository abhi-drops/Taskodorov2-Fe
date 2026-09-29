# Taskodoro Phase 2 — Settings Rename, Apps Tab & Diary

Session date: 2026-09-19, revised 2026-09-29 after wireframes + a richer Diary concept
changed the design materially — this replaces the 2026-09-19 version of this doc
entirely, not just amends it. Splits into two sub-phases continuing `phase2-roadmap.md`'s
numbering: **2.7 — Settings rename, Apps shell, layout changes** and **2.8 — Diary**.
2.7 is a prerequisite for 2.8 (the nav item Diary lives under doesn't exist until 2.7
ships). Read `phase2-roadmap.md`'s "Reuse patterns" section for shared conventions
(web/mobile split, Context-not-a-library, `components/ui/*` shape) — not repeated here.

**What changed since the original version of this doc:** three wireframes
(2026-09-29) showed an actual layout for this, different from the "design inline, no
mockup exists" assumption the first draft made — see 2.7 below. Separately, a new
**Statuses** feature shipped on notes in between (2026-09-22, `feat-notes.md`) — free-text
timestamped entries per note (`note.statuses: { id, text, createdAt }[]`) — which this
revision folds into Diary's data model, since it's exactly the kind of "what did I do to
this note" content a diary should surface. And the Diary concept itself grew from "a
calendar with 3 numbers" into a genuine timeline scrubber that replays a day's changes —
see 2.8.

---

## 2.7 — Settings rename, Apps tab shell, layout changes

**Goal:** the navigation/shell changes that 2.8 (Diary) needs a home inside, plus the
button-position changes visible in the wireframes.

**Depends on:** 2.0–2.6 (all done) — this reworks existing nav/shell components, doesn't
add new data.

### Decisions

1. **"Power Tools" is renamed to "Settings" everywhere** — nav label, page title,
   route naming going forward, doc references. The wireframes themselves still say
   "Power Tools" in the nav pill; that's treated as a not-yet-updated label in a quick
   sketch, not the current naming decision — go with "Settings" per the explicit
   instruction. (Existing internal names like `PowerToolsPage.tsx`/`PowerToolsSidebar` can
   keep their filenames for this pass — rename the user-facing label and page title, not
   necessarily every internal identifier, unless doing so is nearly free while you're
   already in that file.)
2. **Apps becomes a real top-level nav item.** Web top nav order, per the wireframe:
   **Home / Settings / Apps** (3 items, was Home/Power Tools 2). Mobile bottom nav: the
   wireframe shows only **3 icons — Home / Apps (grid) / Settings (gear)** — no "+" in
   the bottom nav anymore.
3. **The "+" quick-add button moves off the bottom nav onto the board itself**, as a
   floating action button — the mobile wireframe shows a purple circular "+" overlapping
   the top-right of the note stack, not a nav-bar icon. This affects `HomePage.tsx`
   (mobile) specifically; web never had a bottom-nav "+" to begin with (its per-column "+"
   for adding a note to a specific group is unaffected — this change is about the
   *global* quick-add affordance, not the existing per-group one, and the two should
   probably just become the same button conceptually: tapping the floating "+" adds to
   whichever group is currently active/visible on mobile, exactly like the existing
   per-column "+" does today per group — confirm this consolidation when building, since
   the wireframe doesn't fully disambiguate it from the existing per-column "+").
4. **Apps gets its own landing area following the same 2-panel pattern Settings already
   uses** (`PowerToolsSidebar` + drill-down right panel, per `style-guide.md`'s "Power
   Tools: row chips + desktop 2-panel drill-down") — the wireframe shows exactly this: a
   left rail listing "Diary" / "Pomodoro" (Pomodoro greyed/disabled, same placeholder
   convention as today), with the selected app's content in the main panel on desktop.
   Mobile: same precedent Settings already set for this — tap a tile, push-navigate into
   that app's own page, no persistent sidebar (confirm by checking how
   `PowerToolsSidebar` actually degrades on mobile today, don't assume, this doc doesn't
   re-verify it).

**Key files:** `components/ui/BottomNav.tsx`/`TopNav.tsx` (nav item changes), whatever
`HomePage.tsx`'s mobile variant needs for the floating "+"  relocation, a new
`AppsPage.tsx` + mobile variant reusing the `PowerToolsSidebar` pattern (extract it to a
shared component if it's currently `PowerToolsPage`-specific — check before assuming it's
already generic).

**Open items:** the exact mechanics of the floating "+" vs. existing per-column "+"
(decision #3's parenthetical) — resolve in-session, low risk either way.

**Status: done (2026-09-29).** Resolved as built: the route also moved to `/settings`
(old `/power-tools*` redirects); Settings' Addons tab was removed (Pomodoro lives in Apps
only); the floating "+" (`FloatingAddButton`) targets the active tab's group — mobile
never showed the per-column "+" (`showHeader={false}`), so there's one add affordance per
platform, no consolidation needed; `PowerToolsSidebar` was *not* generic, so its markup
was extracted to `components/SidebarPanelLayout.tsx`; mobile Apps = tile list +
push-navigation, matching Settings. Diary is a placeholder at `/apps/diary`. See
`feat-apps.md`, `feat-navigation.md`, and the changelog.

---

## 2.8 — Diary

**Goal:** a workspace-scoped timeline: pick a day, scrub through everything that happened
to it note-by-note like a video, see aggregate stats and a history list alongside it.

**Depends on:** 2.7 (needs the Apps shell to live in), 2.3/2.4/2.5 (workspace/group/note
data to log against — all done).

### Why an event log is required, not optional

`notes`/`groups` only ever store *current* state — a note's row has one `group_id`, its
current one, and (as of the Statuses feature) a list of status entries, but no record of
what its *title* or *color* used to be, or when it moved between groups. None of that is
reconstructable from the live tables alone. An append-only log of what changed and when
is the only way to answer "how many notes moved today," let alone replay a day
frame-by-frame — this was true in the original version of this doc for the counts, and
is even more true now that replay needs title/color history too.

### Event vocabulary — extended from the original `created | moved | deleted`

The original design deliberately kept the vocabulary to lifecycle-only, reasoning that
logging every autosaved field edit would turn the log into noise. **This session's
requirement — replaying title, color, and status changes, not just structural moves —
means two of those "edits" now need to be tracked after all.** Kept narrow and
deliberate, not reopened wholesale:

- `created`, `moved`, `deleted` — unchanged from the original design (see decisions #4/#5
  below, carried over).
- **`field_changed`** — new. Fires only for `field: 'title' | 'color'` — **not**
  description, priority, payload, or anything else. These two specifically because
  they're what's visually on a note card (title text, swatch color) and what the replay
  needs to reconstruct a card's appearance over time; description/payload edits stay
  unlogged, same "don't log noise" reasoning as before, just with a narrower exemption
  than "log nothing" now that two fields earned their way in by being asked for
  explicitly.
- **Status entries are not a new event type** — `note.statuses` already carries its own
  `{ id, text, createdAt }[]`, which is itself a timestamped log. The Diary's merged
  timeline treats each status entry as a "changed" event by reading it directly from the
  note's `statuses` column at query time, not by duplicating it into `activity_events`.

**Known limitation, explicitly out of scope for now:** in a `priority`-mode group, a
note's *displayed* color can change when its `priority` changes, without `note.color`
itself changing (`resolveNoteColor`, `feat-notes.md`). This design only logs `note.color`
field writes, not `priority` writes — so replay in a `priority`-mode group won't show the
resulting color shift from a priority edit. Not asked for, not building it; flagging so
it isn't mistaken for a bug later.

### Schema (client SQLite)

Extends the `activity_events` table from the original design (unchanged columns kept,
new ones added):

```
activity_events:
  id             TEXT PRIMARY KEY
  workspace_id   TEXT NOT NULL
  entity_type    TEXT NOT NULL         -- 'workspace' | 'group' | 'note'
  entity_id      TEXT NOT NULL
  action         TEXT NOT NULL         -- 'created' | 'moved' | 'deleted' | 'field_changed'
  from_group_id  TEXT                  -- 'moved' only
  to_group_id    TEXT                  -- 'created' and 'moved' only (unchanged meaning)
  field          TEXT                  -- 'field_changed' only: 'title' | 'color'
  new_value      TEXT                  -- 'field_changed' only: the value after the change
  created_at     INTEGER NOT NULL
```

**Reconstruction needs a genesis value, so `createNote` logs `field_changed` events for
the initial title and color too, in addition to the `created` structural event** — three
rows per note creation instead of one. Without this, "what was the title before the first
edit" has no event to find. With it, reconstructing field `F` on note `N` as of time `T`
is always: the `new_value` of the latest `field_changed` event for `(N, F)` with
`created_at <= T` — a single indexed query, no forward/backward diff-walking needed,
because every field always has at least one prior event once the note exists at all.

Index on `(workspace_id, created_at)` (day-range scan), `(entity_id, field, created_at)`
(per-note-per-field reconstruction), `(workspace_id, entity_type, action, to_group_id)`
(completed-count, unchanged from original design).

Write-call-sites, per the original centralized-instrumentation principle (decision #5,
unchanged — a `moved`/`field_changed` event fires identically regardless of which UI path
triggered it, since it's detected by diffing old vs. new row inside `lib/db/notes.ts`'s
`updateNote`, not by each call site remembering to log): `createNote` logs `created` +
2×`field_changed` (title, color); `updateNote` logs `moved` when `group_id` changes and
`field_changed` when `title` or `color` changes (compare old vs. new, skip if unchanged —
no event for a no-op save); `deleteNote` (soft-delete) logs `deleted`. `workspaces.ts`/
`groups.ts` unchanged from the original design (`created`/`deleted` only, no field
tracking — not asked for on those entities).

### What appears in a selected day's view

**Any note with a `created`, `moved`, `deleted`, or `field_changed` event that day, OR a
status entry added that day** — this is what "activity and created and deleted" resolves
to: activity (moved/field_changed/status) plus the explicit create/delete lifecycle
events, together. A note only edited via its description or checklist items on a given
day (no title/color/group/status change) simply doesn't surface that day — consistent
with the deliberate narrowing of what's tracked at all.

### Calendar view — Diary's landing page

**Missed in the previous revision of this doc** (which dropped the original month-grid
idea entirely, assuming the scrubber replaced it) — it doesn't. The calendar is the entry
point; the scrubber is what a day drills into. Opening Diary lands on a month grid
(`components/ui/Calendar.tsx`, one cell per day — the primitive this doc originally
called for in its first, pre-wireframe draft), where **each day cell shows compact count
chips: Created / Moved / Changes** — three, matching what was asked for, not the full
per-action breakdown the day view's sidebar shows. "Changes" here is a deliberate rollup
rather than a fourth-and-fifth chip: `field_changed` (title + color) + status entries +
`deleted`, combined into one number, so the calendar cell stays glanceable — the day
view's sidebar is where the full per-action breakdown (Title edits / Color changes /
Status entries / Deleted, each separate) lives instead. Flagging this rollup explicitly
since it's an inference, not something you specified count-by-count — say so if you
wanted "changes" split differently.

- **Query once per visible month, not once per day** — a single grouped query over the
  month's date range (`GROUP BY` local day + action) feeding all ~30 cells, not 30
  separate day queries. Same underlying `activity_events`/`statuses` data the day view
  reads, just aggregated at month-grain instead of event-grain.
- **A day with zero activity across all three counts shows no chip row** (or a plainly
  empty cell) rather than three visible zeros — keeps a sparse month from being a wall of
  "0 · 0 · 0".
- **Clicking a day cell navigates into that day's scrubber view** (2.8's day view,
  below) — this is the calendar's only interactive affordance; it's a picker, not itself
  a place to inspect individual events.

### The scrubber — day-local replay, drilled into from the calendar

Per the wireframes and the clarified requirement, reached by clicking a day in the
calendar above (the corner date control described next is for *once inside* a day, to
step to adjacent days without bouncing back out to the calendar each time):

- **A compact date control (top-right) picks the day** — coarse navigation, jump to any
  date directly, or step to the previous/next day, without returning to the calendar.
- **A horizontal slider scrubs through that day's events frame-by-frame.** Build one
  merged, time-ordered feed per day: every `activity_events` row for that
  `(workspace_id, day)` plus every note's status entries whose `createdAt` falls in that
  day, sorted by timestamp. Each position on the slider = one entry in that feed.
- **At each frame, note cards reflect reconstructed state as of that moment** — not live
  current state. Title and color come from the reconstruction query above; group
  membership comes from the note's `to_group_id`/`from_group_id` history up to that frame
  (a note "exists on the board" between its `created` frame and, if present, its
  `deleted` frame; its group is whatever the latest `moved`/`created` event before the
  current frame says). This is what makes it read "like a video" — a note visibly
  appearing, moving, being retitled/recolored, or disappearing as the slider advances,
  reusing the existing `BasicNoteCard`/`CounterNoteCard`/`ListNoteCard` components fed
  reconstructed props instead of a live DB row.
- **A sidebar alongside the scrubber shows: aggregate counts per action type for the
  selected day** (Created / Moved / Deleted / Title edits / Color changes / Status
  entries — each just a count of that action in the day's feed), **and the same feed as a
  scrollable, human-readable list** (e.g. "Created 'Buy groceries'", "Retitled 'Finish
  report' → 'Finish report v2'", "Moved 'Finish report': Todo → In Progress", "Added
  status to 'Buy groceries': 'got the milk'"). Clicking an entry in this list jumps the
  slider to that frame — natural, low-cost pairing of the two views, confirm when
  building rather than treating as locked spec.

### Per-note detail panel

Clicking a note (on the board-replay view, at whatever frame is currently scrubbed to)
opens a side panel (per the wireframe's "show details of the selected note... list of
changes" annotation) listing **that note's events for the selected day only** — not its
full history — filtered from the same per-day merged feed down to that one `entity_id`.
Deliberately narrower than the day-wide sidebar list: this panel answers "what happened
to *this* note today," the day sidebar answers "what happened in this *workspace* today."

### New UI surface

- `src/pages/DiaryPage.tsx` + mobile variant — the **calendar** (Diary's landing page),
  reached via 2.7's Apps shell. Owns month navigation (prev/next month) and renders
  `components/ui/Calendar.tsx`.
- `components/ui/Calendar.tsx` — generic month-grid primitive (`month`, per-day
  `renderCell` or similar), no Diary-specific logic baked in, following the established
  `components/ui/*` shape.
- `src/pages/DiaryDayPage.tsx` + mobile variant — the **scrubber view**, reached by
  clicking a calendar day (e.g. `/apps/diary/:date`). Owns the date corner-control,
  scrubber, sidebar, and per-note detail panel described above.
- `components/ui/DateJumper.tsx` (or similar) — the corner date control, used only inside
  `DiaryDayPage`, not the calendar.
- `components/ui/Scrubber.tsx` — the horizontal slider primitive, generic enough to just
  take `(frameCount, currentFrame, onChange)`, no Diary-specific logic in it.
- `src/common_logics/useDiaryCalendar.ts` — month-range aggregate query (the 3 rollup
  chips per day) for `DiaryPage`.
- `src/common_logics/useDiaryDay.ts` — the selected day's merged feed, current scrub
  position, reconstructed note state at that position, and the full per-action counts,
  for `DiaryDayPage`. (Split from a single `useDiary.ts` since the calendar and day view
  now query at genuinely different granularities — month-aggregate vs. single-day-event —
  rather than being two views over the same hook.)
- `src/lib/db/events.ts` — `logEvent(...)` (called only from `workspaces.ts`/`groups.ts`/
  `notes.ts`, per decision #5) plus the reconstruction/aggregate queries
  (`getFieldValueAsOf`, `getDayFeed`, `getNoteDayFeed`, `getMonthCounts`) the two hooks
  above call into.

### Completed-group setting (carried over, unaffected by anything above)

Still a single workspace-level "Completed Group" `<Select>` on the (now-renamed)
Settings screen, `workspaces.completed_group_id` (nullable, no `.references()` — same
reasoning as `groups.on_check_move_to_group_id`), still strictly `0` when unset, no
fallback. Completed count query unchanged: `COUNT(*) WHERE action IN ('created','moved')
AND to_group_id = workspace.completedGroupId` for the day, now just one line among
several in the sidebar's count breakdown rather than its own dedicated UI element.

### Migration note

`workspaces.completed_group_id`, the new `activity_events` table, and its `field`/
`new_value` columns all need the idempotent `ensureColumn`/`CREATE TABLE IF NOT EXISTS` +
`migrateSchema()` treatment already established for `groups.reset_on_move`
(`feat-offline-data-layer.md`) — follow that exact precedent.

### Open items for whoever builds this

- Exact reconstruction of "which group is this note in at frame F" when a note was
  created directly into a group and never moved — falls out naturally from "latest
  `created`/`moved` event at-or-before F," just confirm the query actually reads that way
  when implemented.
- Performance of the day-feed query at real data volumes is untested — fine to defer,
  personal-app scale, revisit only if it's ever actually slow.
- Whether jumping the date corner-control resets the scrubber to frame 0 or the last
  frame of the new day — small UX call, decide in-session.

---

## Phase 3 (backend/sync) implications — not built now, noted for `phase3-sync-plan.md`

- `notes.statuses` (new since that doc was written) needs a matching column in the
  backend `notes` table — `phase3-sync-plan.md` §2's schema predates this feature.
- `activity_events` (this doc) is the 4th table `phase3-sync-plan.md` already flagged as
  "pick this up when Phase 3 starts" — still append-only, still trivial to sync (insert
  any id the server doesn't have, no LWW needed), just larger in volume now that title/
  color edits are tracked too, not only lifecycle events. Worth a row-count sanity check
  whenever Phase 3 sync is actually built, not a redesign.
