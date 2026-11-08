# Feature: Onboarding

How a new user learns the app in about a minute, and how the rest of it is introduced as
they use it. Added 2026-11-08. Motivation: feedback that the app is hard to understand the
first time. The main surprise was that checking a note **moves it to the next group**, and
nothing explained that.

Four parts, in the order a user meets them:

1. **Intro slides**: five animated screens on a fresh install.
2. **Board tour**: an interactive spotlight tour of the first board.
3. **Feature tours**: a 1 to 2 step tour the first time a major feature is opened.
4. **Milestone tips**: one quiet tip per session once the user reaches a milestone. This is
   the soft form of progressive disclosure: nothing is hidden before it.

All of it is skippable, runs at most once per flag, and is ordered so nothing stacks.

## Where it lives

| Piece | File |
|---|---|
| Host: decides what runs next, mounted in `App.tsx` | `src/components/onboarding/OnboardingHost.tsx` |
| Intro slides (lazy chunk) | `src/components/onboarding/IntroSlides.tsx` |
| Spotlight + callout | `src/components/onboarding/TourOverlay.tsx` |
| Milestone tip card | `src/components/onboarding/NudgeTip.tsx` |
| Tours as data (board + feature) | `src/lib/onboarding/tours.ts` |
| Milestone tips as data | `src/lib/onboarding/tips.ts` |
| Flags (in-memory mirror) | `src/lib/onboarding/flags.ts` |
| What is on screen now (`useOnboardingPending`) | `src/lib/onboarding/onboardingState.ts` |
| "A note was checked" event | `src/lib/onboarding/noteCheckEvents.ts` |
| Flag storage | `src/lib/db/userState.ts`, `userStateSchema.ts` |
| Counts the tips use | `src/lib/db/onboardingStats.ts` |

No tour library: a custom spotlight keeps the style guide's rules (no blur or feathered
masks, hard ink outline, paper callout) and adds no dependency.

## Order and gating

`OnboardingHost` is a sibling of `RouterProvider` (like the other dialogs), so it reads the
route from the exported `router` (`router.subscribe`), not `useLocation`.

Priority, highest first: forced update > "works best in the Android app" notice >
**onboarding (intro, then board tour)** > What's new > feedback prompt. Each of the last
two reads `useOnboardingPending()` and stays unrendered while it is true. That is also true
before the flags have loaded, so neither can flash up first. `FeedbackPrompt` now also waits
for the mobile-web notice (it did not before).

The host starts something only when there is no forced update, the notice is closed, the
workspace is `ready` and the flags have loaded. Then, one at a time:

1. `intro.seen` unset: the intro slides.
2. `boardTour.seen` unset and the route is `/`: the board tour (after a 700 ms settle).
3. A feature tour whose `matchPath` fits the route and whose flag is unset (once What's
   new is out of the way).
4. A milestone tip, on `/` only, at most one per app session.

## Intro slides

Five screens (sticky notes, check-and-move, note types, the Diary, kept on your device). **Each one is
interactive**. There is no separate instruction text: every slide is just an illustration, a
title and one short line, and that line changes as you play to say what happened. A ring
pulses around the first thing to tap until the slide has been tried (`PulseRing`). The first
version had a violet caption line under each slide; it read as clutter, so it was removed.
The title and line sit on a solid light panel (the board's column-backdrop look), because
the grid-paper background ran lines through the letters. The slides:
1. drag the notes anywhere and tap a circle to check one;
2. check the note yourself and watch it move Todo → Doing (arrives unchecked) → Done (stays
   checked), as a real Todo group behaves; tapping it again replays;
3. the three note types actually work: check the task, count the counter up (it ticks
   itself off at the target, like the board), tick the checklist;
4. the Diary, **a different slide per layout because the real Diary differs**
   (`DiarySlide` picks by `usePlatform().isMobile`):
   - desktop: a mini board replays one day (add, add, move, done) by itself, then the
     Diary's own `Scrubber` lets you drag back and forth, and the line under it names each
     moment ("13:00. Call Sam moves to Doing.");
   - mobile: the real mobile Diary has no replay (it is a calendar of coloured dots and a
     tap-a-day summary), so the slide is three days you tap through: each shows its dots and a
     short list of changes with the Diary's colour-coded chips (violet created, blue moved,
     green checked). It is deliberately only the strip and the list: a first version also had
     the Diary's count tiles, a "Changes" heading, weekday labels, times and a quiet day, and
     read as cluttered;
5. a "Sync with Google" switch that puts the note on a second device. It is a demo only, and
   the line under it says real sync needs a Google sign-in.

Swiping between slides starts only from the parts of a slide not marked `data-no-swipe`
(`useDragControls`): the draggable notes of slide 1 and the Diary timeline keep their own
drag, otherwise dragging the timeline thumb also swiped to the next slide.
They are built from the
app's own pieces (the same card markup as `BasicNoteCard`, `CounterNoteCard` and
`ListNoteCard`, plus `CheckCircle`) so they stay sharp and follow the design tokens. They are lazy-loaded:
`motion` is used only here, and `routes.tsx` keeps it out of the main chunk on purpose
(a 7 kB chunk, plus `motion`, which the Diary already loads lazily). `MotionConfig reducedMotion="user"` turns the
movement off for people who ask. Skip, Escape, Start, and Android Back on the first slide all
end it; Back on a later slide goes to the previous one. Copy deliberately makes no
"no login" claim.

## Board tour

Four steps (`BOARD_TOUR` in `tours.ts`): add a note, **check a note** (the target stays
clickable and the step ends on a real check), what happened, and where Settings and Apps
are. A step points at an element by a CSS selector over `data-tour` attributes; no selector
means a centred card.

### The spotlight

- Four dim rectangles around the target plus a white-and-violet outline. The rectangles also
  swallow taps outside the hole, so the app underneath is only reachable through the target
  and only on a `'check'` step (other steps cover the hole with a transparent panel too).
- It tracks the element with `requestAnimationFrame` and scrolls it into view, so it
  follows the board's horizontal scroll and the view transitions.
- Mobile: the callout sits above the bottom nav, or at the top when the target is in the
  lower half. Desktop: below the target, above if there is no room.
- Layer is `z-[80]`, above the `Select` menu (70) and Modal (50). It sets no
  `view-transition-name`. Escape and the Android back button leave the tour
  (`pushBackHandler`).
- `useSuppressHeaderBackdrop` is not used: that context only exists inside `AppShell`, and
  the overlay sits outside the router. The header's tape backdrop therefore sits under the
  dim, which is only visible when the page is scrolled.

### Missing anchors

The default board can be replaced (a Google sign-in can swap in the account's data) and the
two layouts differ, so a step whose element does not appear within 4 s is skipped. Never
anchor to note titles. A **feature tour only counts as seen if one of its steps was
actually shown**: a tour that found nothing (the Settings tour opened on the About tab) is
not marked, and is not retried at that same route + query, so it neither loops nor is
silently used up. The board tour is the exception: it is first-run only, so it always counts
as done.

### "Why did it move" on mobile

The mobile board shows one group at a time, so after the check step the note would just
vanish from the tab the user is on. The tour therefore switches the board to the group the
note went to (`requestShowGroup` in `lib/onboarding/boardFocus.ts`; only the mobile
`HomePage` subscribes, the same way it already switches tab after a drag), and step 3
points at that now-active tab (`data-tour="active-group-tab"` in `BoardTabStrip`) with a
callout that says the tour switched tabs for them. A step's `selector` can be a function of
the tour context (`movedTo`, `isMobile`) for this; on desktop the step stays a centred card.

### "Why did it move"

`applyOnCheckMove` (`lib/notes/onCheckMove.ts`), which every card and the note editor
already call, emits `emitNoteChecked({ noteId, movedToGroupId })` on an unchecked-to-checked
transition. The board tour waits on it and names the destination group (via
`getGroupById`), or says the group has no rule if nothing moved. The step's check
listener reads its callback through a ref: a parent re-render used to re-subscribe it and
cancel the pending advance.

## Feature tours

`FEATURE_TOURS` in `tours.ts`: note editor, Settings, group settings, Diary, Templates,
Search. Each is 1 to 2 steps. Anchors added with `data-tour`: `add-note` (the floating "+"
on mobile, each column's "+" on desktop; the first match wins), `check` (every `CheckCircle`;
the tour's selector adds `[aria-checked="false"]`), `nav` (`TopNav` / `BottomNav`),
`note-type`, `note-color`, `group-gear`, `group-on-check`, `group-hide-after`. Only one of
the desktop or mobile trees renders at a time, so one name can sit on different elements.

## Milestone tips

`TIPS` in `tips.ts`, in priority order, each with a condition over two counts
(`getOnboardingStats`: notes that exist, and "moved" events in the Diary log):

| Tip | Shown when | Opens |
|---|---|---|
| Group rules | a note has moved | Settings |
| Diary | 3 moves | Diary |
| Templates | 8 notes | Templates |
| Sync | 12 notes and not signed in with Google | Settings, sync chip (`?focus=sync`) |

A tip appears 5 s after the board is quiet (2.5 s after an edit), at most once ever (its
flag) and once per session. "Not now" and accepting both use it up. Accepting navigates; the
destination's own feature tour does the explaining. There is no "New" dot on the nav yet.

## Persistence and sync

Flags live in SQLite, table `user_state` (`key`, `value` 0/1, `updated_at`, `dirty`), not
Preferences, so they ride the existing dirty-tracking and `/sync` path and follow a Google
account to another device.

Keys: `intro.seen`, `boardTour.seen`, `tour.<name>` per feature tour, `tip.<name>` per tip.
`lib/onboarding/flags.ts` keeps an in-memory copy (a `useSyncExternalStore` store) so a
flag set now is visible on the next render; the write follows. A failed read is treated as
"everything seen" so a broken database never traps someone in onboarding.

- **Existing installs.** `ensureUserState` runs in `initDb` before `seedIfEmpty`: if the
  table does not exist yet **and workspaces do**, the install predates onboarding, so
  `intro.seen` and `boardTour.seen` are written as seen (not dirty, so an account's real
  flags are never overwritten by a migration marker). Feature tours still run on first
  visit. A fresh install has neither, so the intro runs. This reads the database rather
  than a Preferences marker, so it does not depend on the order other providers write
  their own first-run markers.
- **Sync.** Last-write-wins per key by `updated_at`. `collectNextBatch` has a final
  `userState` phase; `applyPulledChanges` applies pulled rows only if at least as new as
  the local row; `markEverythingDirty` includes the table. The array is sent only when a
  row is dirty and a missing `userState` in a response is treated as empty, so an older
  server is tolerated on pull. The wire contract the backend must implement:
  `docs/feat-onboarding-sync-from-be.md`.
- **Not wiped on logout or by `wipeSyncedData`.** They are device-level progress: a user
  who signs out should not be walked through the intro again. "Reset to Default" does
  delete them, so it looks like a fresh install.
- **Because the intro cannot be reached before signing in,** a new install always shows it
  once. Account sync mostly helps feature tours and milestone tips on a second device.

## Settings → About

"Replay Intro" clears `intro.seen` and `boardTour.seen` (it starts at once). "Reset Tips"
clears every `tour.*` and `tip.*` flag (it does not touch the board tour).

## Template change

The default board's three sample notes in the Todo group were shortened now that the tour
explains them (`DEFAULT_TEMPLATE_CONTENT`, `lib/templates/builtins.ts`). The board tour's
check step wants an unchecked note, so the default board must keep at least one.

## Verified, and not

Browser-tested: fresh install on desktop and the mobile layout (notice first, then the
intro, then all four board-tour steps including the real check), a tip and its
destination's feature tour, an anchor on a different panel being skipped, Reset Tips,
the existing-install migration, flag dirty/clear, push collection order and pull
last-write-wins.

Not tested: Android native (hardware back during the slides, safe-area spacing on a real
device), `prefers-reduced-motion` in a browser, the push/pull against a real backend (the
backend contract is not deployed yet), and a drag during the tour.
