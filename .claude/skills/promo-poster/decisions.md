# Promo poster decisions and feedback

The user's rulings on Taskodoro promotion posters, newest first. Read this before making
a post, and add an entry at the top whenever the user gives feedback (see SKILL.md,
"Record feedback"). "Scope: all posts" means it is a standing rule.

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
