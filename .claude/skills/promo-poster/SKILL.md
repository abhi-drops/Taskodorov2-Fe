---
name: promo-poster
description: Make Instagram promotion posters and carousels for Taskodoro as PNG images, in the app's own look, saved under promotions/<post-title>/. Use this whenever the user asks for a promo image, poster, Instagram post, carousel, slide set, story graphic or "post about X" for Taskodoro, wants to change or re-export an existing post in promotions/, or gives feedback on a poster's look or wording. Also use it when they only give a post title and a few points to put on slides.
---

# Promo poster

Turns a post title and a few points into a set of PNG slides for Instagram. Each slide is
an HTML page styled like the app (same fonts, colours, note cards) and captured with
Hyperframes. Posts live in `promotions/<post-slug>/` at the repo root.

Three files hold what has been learned so far. Read the first two before designing
anything, because they are the user's taste and rulings, not suggestions:

- `decisions.md` — the user's decisions and feedback, newest first. **You also write to
  this file** (see "Record feedback" below).
- `aesthetics.md` — the visual system: sizes, colours, type, components, slide patterns.
- `template/index.html` — a working, approved post ("Taskodoro ideology") to start from.

## Workflow

### 1. Read the rulings, then plan the slides

Read `decisions.md` and `aesthetics.md`. Then decide the slides: usually a cover, one
slide per point, and a closing slide. Keep the user's wording for their points; fix
grammar only. Anything you add beyond their text (a subtitle, a label, sample note text)
is yours, so keep it small and list it in your final message so they can veto it.

Claims on a poster must be true of the app. Check a feature in `docs/feat-*.md` or the
code before showing it, and prefer real copy (template names, button labels, default
notes from `src/lib/templates/builtins.ts`) over invented copy.

### 2. Create the post folder

```bash
.claude/skills/promo-poster/scripts/new-post.sh <post-slug>
```

`<post-slug>` is the post title in kebab-case (`taskodoro-ideology`). This creates
`promotions/<post-slug>/source/` with the template, the app's fonts and images, and the
grid background. It will not overwrite an `index.html` that is already there, so it is
safe to re-run on an existing post.

### 3. Edit `source/index.html`

Each slide is one `<div class="clip slide" data-start="N" data-duration="1">`, numbered
from `data-start="0"`. Keep them one second each and in order: the export script captures
slide N at N−0.5 seconds. When the slide count changes, update `data-duration` on
`#root`, the `tl.set({}, {}, <count>)` line at the bottom, and the "n / total" page chips.

Build visuals from the classes already in the template (see `aesthetics.md` for the
list) so every post looks like the same family. Lay slides out with normal flow and
flexbox rather than absolute pixel positions; Geomini's text widths are hard to guess and
flow layout absorbs the difference.

### 4. Real screenshots, when a slide shows the app itself

```bash
.claude/skills/promo-poster/scripts/app-screenshots.sh <post-slug> [route] [text-to-wait-for]
```

Saves `assets/img/app-desktop.png` (1440×860 at 1.5×) and `app-mobile.png` (412×880 at
3×). It starts two temporary dev servers, waits for the board to load, and stops them
again. Defaults: route `/`, waiting for the text "Click to edit me".

Two things to tell the user whenever these are used:
- The mobile image is the app's real mobile layout rendered in a browser, not a capture
  from a phone. It has no Android status bar. A device capture needs a phone on `adb`.
- Each run is a fresh install, so it shows the default first-launch board.

### 5. Export and look

```bash
.claude/skills/promo-poster/scripts/export.sh <post-slug> cover first-point second-point closing
```

One name per slide, in order. Output is `promotions/<post-slug>/01-cover.png`, … plus
`source/contact-sheet.jpg`. **Open the contact sheet (or the PNGs) and look before
reporting.** Check for text running into the footer, clipped words, overlapping
elements, and colours that did not apply. Fix and re-export until it is clean.

Also write `promotions/<post-slug>/caption.txt` with the post caption.

### 6. Record feedback

Whenever the user reacts to a poster ("I like the cover", "remove the number boxes",
"use screenshots here"), add an entry at the top of `decisions.md` in the same turn you
act on it. That file is the only memory this skill has between sessions; a preference
that is not written there will be relearned the hard way.

- Record what they said (quote it), what you changed, and how far it reaches: this post
  only, or every future post.
- Label your own reading of an ambiguous remark as an interpretation.
- If the feedback changes the visual system itself (a new slide pattern, a banned
  element, a new colour rule), update `aesthetics.md` and `template/index.html` too, so
  the next post starts from the corrected version.
- If a new entry overrides an older one, mark the older one as superseded rather than
  deleting it.

### 7. Report

Tell the user where the files are, what each slide says, anything you added beyond their
text, and any caveat (sample data, browser-rendered mobile screenshot). Keep it short.

## Notes

- `promotions/` is not ignored by git. Do not commit it unless the user asks.
- Other sizes: the template is 1080×1350 (4:5). For square or story sizes change the
  viewport meta, `html, body`, `#root`, `.slide` and `data-width`/`data-height`; the
  sizes are in `aesthetics.md`.
- Videos are a different tool (the `brag` plugin). This skill is for still images.
- Needs `ffmpeg`, Node and `npx hyperframes` (the first run downloads a headless Chrome
  with `npx hyperframes browser ensure`).
