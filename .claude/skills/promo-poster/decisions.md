# Promo poster decisions and feedback

The user's rulings on Taskodoro promotion posters, newest first. Read this before making
a post, and add an entry at the top whenever the user gives feedback (see SKILL.md,
"Record feedback"). "Scope: all posts" means it is a standing rule.

---

## 2026-10-25 — Real screenshot instead of a hand-built mockup when it keeps breaking
- Said: "in slide 5 there is an additiional chip for template fix , side 4 is fully
  broken todos , try scaled down ( more resolution display version of components )"
  (post: taskodoro-feature-tour)
- Decision: two fixes. (1) Slide 5 had a redundant "Template" chip next to "Weekly
  Planner" duplicating the "Templates" section chip above it — removed. (2) Slide 4 (the
  3 note-type cards) had gone through several rounds of hand-tuned CSS and kept breaking
  (congested counter, then an overflow bug) — instead of tuning it again, drove the
  actual running app (`npm run dev`) with a Puppeteer script to create one real basic,
  counter, and checklist note, checked one checklist item, incremented the counter to
  3/6, then screenshotted just that column at `deviceScaleFactor: 2` (same "capture
  high-res, display smaller" technique as `app-screenshots.sh`) and used that PNG
  directly in the slide instead of recreated CSS. Script kept at
  `.claude/skills/promo-poster/scripts/notes-screenshot.cjs` as a reusable pattern.
- Scope: all posts. When a hand-built CSS recreation of a specific app view keeps
  breaking across edits (not just needs a tweak), stop re-tuning it and get a real
  screenshot instead — it's not just more accurate, it sidesteps the whole class of
  flexbox/sizing bugs recreated markup is prone to. Reach for this earlier next time a
  slide shows multiple real UI pieces together (not just "how it looks" slides).
- Status: active

## 2026-10-25 — Balance vertical space; don't let visuals sink to the bottom
- Said: "there is a lot of space in the middle for many slides like this balance spacing
  propelry and also this notes fill conjested especially counter" (post:
  taskodoro-feature-tour, re: the notes slide)
- Decision: two fixes. (1) `.vis { margin-top: auto; }` became `margin-top: auto;
  margin-bottom: auto;` so a slide's visual centers in the leftover space below the
  headline/subtitle instead of sinking to the very bottom with a dead gap above it — but
  centering alone wasn't enough when the visual itself was small, so (2) the note cards,
  cover swatches, template card, and settings fields were all enlarged (bigger padding,
  font, control sizes) so the visual actually fills more of the slide instead of just
  repositioning a small object in a big empty area.
- Scope: all posts — this template-level CSS change lives in `template/index.html` too,
  and the lesson ("size first, then center — centering a tiny visual in a big gap still
  looks empty") applies to any slide with a short headline/subtitle and a light visual.
- Status: active

## 2026-10-25 — Flexbox gotcha: don't give row-flex children explicit square width+height
- Decision (not user feedback, a bug note): enlarging the cover's 4 colour swatches to
  230px each overflowed the row (4×230 + 3×44 gap > the 920px content width), and
  flexbox's default `flex-shrink: 1` squeezed only the WIDTH to fit — height stayed at
  230px since shrink only acts on the main axis — turning perfect circles into ovals.
  Fixed by sizing them to fit (190px) and adding `flex: none` so they can't be
  auto-shrunk again. Same root cause nearly broke the notes slide: "Water bottles" at a
  bigger font forced the blue card wider than its equal-thirds share (flex items default
  to `min-width: auto`, so they won't shrink below their own content width), pushing the
  list card off-canvas — fixed with `min-width: 0` on each card.
- Scope: all posts. Whenever enlarging a flex-row element (especially anything meant to
  stay perfectly square/circular, or any card sharing a row with siblings), either do the
  arithmetic against the available width first, or add `flex: none` (fixed-size items)
  / `min-width: 0` (equal-share items that must be allowed to shrink) — don't just bump
  the number and assume flexbox will keep it square. Re-render at full size and check
  for clipping/ovals before calling a slide done, not just the contact-sheet thumbnail.
- Status: active

## 2026-10-25 — "Now in beta" + "Link in bio" are now said
- Said: "also include now in beta & link in bio , web + android" (post: taskodoro-feature-tour)
- Decision: the closing slide gained a yellow "Now in beta" chip above the logo, and the
  footer reads "Web + Android · Link in bio" instead of just "Web + Android".
- Scope: this post for the chip placement. My interpretation: "Now in beta" and "Link in
  bio" are approved claims for later posts too, now that the app is actually in beta —
  reconfirm before reusing once the app leaves beta.
- Status: active

## 2026-10-25 — Sync is a real, current feature now (not "coming soon")
- Said: "use sync with in android and web ( laptops )" (post: taskodoro-feature-tour)
- Decision: added a "Stay in sync." slide — phone + laptop with a sync icon, copy:
  "Sign in with Google and your board matches everywhere — Android and your laptop."
  The standing memory note calling sync "planned" is stale: `docs/feat-sync.md` says it's
  fully implemented on both sides, so it's fine to show as a live feature, not a teaser.
- Scope: all posts
- Status: active

## 2026-10-25 — Merge related features onto one slide when asked
- Said: "merge Workspaces & Groups , remove Search"
- Decision: one slide now covers both workspaces (switcher chips) and groups (3-column
  board + a check-to-move strip), headline "Organize it your way." Search was dropped
  from the feature-tour post entirely (not every feature needs its own slide, or any
  slide, in an "all features" post).
- Scope: this post. Interpretation: merging two related features onto one slide, or
  dropping a minor one, is fine when the user asks for a tighter post.
- Status: active

## 2026-10-25 — Cover text wants real options, not just descriptions
- Said: "generate images for 10 and ask me to choose" (after already getting 10 text
  descriptions of cover visual concepts)
- Decision: built a throwaway 10-slide comparison deck in the post's own `source/`,
  exported all 10 as real PNGs/a contact sheet, sent those, then let the user pick
  before building the final deck. Chosen: a four-circle colour swatch row under the
  headline "Everything Taskodoro can do." (no subtitle).
- Scope: all posts. When a user is picking between visual options (not just copy), show
  rendered images, not prose descriptions — text descriptions of a visual are not enough
  for this user to decide from.
- Status: active

## 2026-10-25 — export.sh is stale for the current hyperframes CLI
- Decision (not user feedback, a tooling note): `scripts/export.sh` expects
  `snapshots/frame-NN-at-*.png` in the post's `source/` dir, but the installed
  `hyperframes` CLI now writes to `.hyperframes/artifacts/snapshots/<uuid>/` instead.
  Ran `npx hyperframes snapshot --at ... --no-end --describe false` directly and copied
  frames from that nested path by hand instead of using export.sh as-is.
- Scope: all posts, until export.sh is updated to match the new output path.
- Status: active

Entry format:

```
## YYYY-MM-DD — short title
- Said: "the user's words"
- Decision: what was done / what to do from now on
- Scope: this post only | all posts
- Status: active | superseded by <date/title> | open question
```

---

## 2026-10-10 — More air between a headline and the lines under it
- Said: "add more space between main title and subtexts below in page 8" (post: why-the-name-taskodoro)
- Decision: the gap between the closing slide's headline and its supporting lines went from 48px to 110px.
- Scope: this slide. My interpretation: on centred closing slides, keep roughly 100px or more between the headline and the lines under it in future posts.
- Status: active

## 2026-10-10 — "Free and open source" is now said
- Said: "also make an 8th slide to say 'follow to find more about the journey, coming soon on web + android, free and open source'" (post: why-the-name-taskodoro)
- Decision: added that closing slide. The earlier hold on "free and open source" is lifted: the user chose to say it here. The how-taskodoro-happened post still does not carry it, since it was removed from that one on request.
- Scope: the claim may be used on posts from now on (interpretation); the closing-slide wording is a reusable pattern: follow line, then "Coming soon on web + Android.", then "Free and open source."
- Status: active

## 2026-10-10 — Emoji are fine when the user writes them
- Said: the script for the "why-the-name-taskodoro" post included 😅 🙂 😂 in its own text.
- Decision: keep the user's emoji where they put them, in supporting lines and captions. Do not add emoji of Claude's own, and keep them out of big Geomini headlines. They render with the machine's "Noto Color Emoji" font (class `.emo`).
- Scope: all posts (interpretation: the user did not state a rule; this follows from their script)
- Status: active

## 2026-10-10 — Hold the "free and open source" claim
- Said: "remove 7th - we will say that later" (post: how-taskodoro-happened)
- Decision: the seventh slide is removed and the post is back to six slides. Do not put "free and open source" on any poster or caption until the user says it is time.
- Scope: all posts, until lifted
- Status: superseded by "Free and open source is now said"
- Note: the user did not say where "Coming soon for web + Android." should go once slide 7 was gone. Claude put it back on the "Follow" slide, where the user's original script had it (interpretation).

## 2026-10-10 — "Free and open source" is a selling point
- Said: "add free and open source at the end - 7th slide and also remove coming soon for web and android in 6th and put it in 7th" (post: how-taskodoro-happened)
- Decision: the story post ends on a seventh slide, "Free and open source." with "Coming soon for web + Android." under it; the "Follow" slide before it carries only the follow line.
- Scope: this post for the slide order. My interpretation: "free and open source" and "coming soon for web + Android" are approved claims that later posts may reuse.
- Status: superseded by "Hold the free and open source claim"

## 2026-10-10 — No text label in the footer
- Said: "in the existing poster remove 'your comfort planner' from 1-cover, 'taskodoro ideology' from other pages footer"
- Decision: removed the footer's left-hand label on the cover and on slides 2-4 of the ideology post. The footer now holds only the "Swipe" chip, right-aligned. The closing slide's tagline under the wordmark is untouched.
- Scope: asked for this post. My interpretation: the label is unwanted in general, so the template and `aesthetics.md` now leave it out by default. Confirm or reverse if a later post should have one.
- Status: active

## 2026-10-10 — Keep the skill's memory in files
- Said: "make this instagram promotion poster maker into a claude skill in this project with a file saving new decisions and feedback from me for future use and save aesthetics in it for future use"
- Decision: this file holds decisions and feedback; `aesthetics.md` holds the visual system. Both are updated as part of the work, not as an afterthought.
- Scope: all posts
- Status: active

## 2026-10-10 — Show the app with real screenshots
- Said: "in 4 to show aesthetics show a desktop and mobile screenshot of home"
- Decision: a slide whose point is how the app looks uses real screenshots of the home board, desktop in a square frame and mobile in a phone frame, not recreated UI pieces.
- Scope: all posts (my interpretation: it applies to any "how it looks" slide; slides explaining one feature can still use recreated cards)
- Status: active

## 2026-10-10 — The aesthetics slide needed different imagery
- Said: "in 4 use a different images to show aesthetics"
- Decision: the first version (status-strip note, counter, checklist) was rejected. A second version (nav bar, colour picker, two-column mini board) was then replaced by real screenshots, see above.
- Scope: this post
- Status: superseded by "Show the app with real screenshots"

## 2026-10-10 — No numbered boxes on content slides
- Said: "on other pages remove number in yellow box"
- Decision: content slides have no coloured number square above the headline. The headline sits directly under the logo row. Numbers may still appear on the cover's three sticky notes.
- Scope: all posts
- Status: active

## 2026-10-10 — Closing slide stays bare
- Said: "5) remove that simple, advanced ... chips"
- Decision: the closing slide is logo, "Taskodoro" and the tagline only. No feature chips.
- Scope: all posts
- Status: active

## 2026-10-10 — The cover is approved
- Said: "i like the cover"
- Decision: keep the cover pattern: logo row, page chip, huge two-line title, one-line subtitle, three overlapping sticky squares numbered 1-2-3, "Swipe" chip.
- Scope: all posts
- Status: active

## 2026-10-10 — Folder convention
- Said: "create a folder promotions and save it in /title-of-post"
- Decision: every post goes in `promotions/<post-title-in-kebab-case>/`, with the PNGs at the top level and the editable HTML in `source/`.
- Scope: all posts
- Status: active

## 2026-10-10 — Tagline and ideology
- Said: "Taskodoro: your comfort planner." and the three ideology points: built for both simple & advanced users; usable right after the first launch, advanced features figured out later as needed; simple unique aesthetic features that make life easier & eye pleasing.
- Decision: "Your comfort planner." is the tagline for closing slides and captions. The three points are the brand's positioning and can be reused as themes for later posts.
- Scope: all posts
- Status: active

## 2026-10-10 — Claims not to make
- Said: "don't mention no login or one codebase as a factor, we will add google sync"
- Decision: never sell "no login / no account needed" or "one codebase". Lead with features: templates (make, edit, share, generate with an AI assistant), statuses with date and time, check-to-move, the Diary.
- Scope: all posts (also applies to videos)
- Status: active

## Open questions (not yet ruled on)
- The closing slide's small "Web + Android" footer line was added by Claude and has not been confirmed or rejected.
- Screenshots show the default first-launch board, which leaves the desktop shot half empty. Whether to stage a fuller sample board is undecided.
- The mobile screenshot is browser-rendered, not from a device. A real device capture was offered and not yet requested.
- The first-launch slide's "Later, when you need them" list (Templates, Diary, Statuses, Group settings) and the sample notes on the "Simple" panel were Claude's additions; not commented on.
