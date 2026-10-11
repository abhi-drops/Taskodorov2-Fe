# Promo poster aesthetics

The visual system for Taskodoro posters. It is the app's own design language
(`docs/style-guide.md`) scaled up for a 1080px image. Change this file when the user's
feedback changes the look, and record why in `decisions.md`.

## Canvas

| Use | Size | Notes |
|---|---|---|
| Feed post / carousel (default) | 1080×1350 | 4:5, the tallest the feed shows |
| Square | 1080×1080 | |
| Story / Reel cover | 1080×1920 | keep text out of the top and bottom 250px |

Slide padding: 72px top, 80px sides, 172px bottom (room for the footer).

## Colour

| Token | Value | Used for |
|---|---|---|
| surface | `#f4f5f7` | page ground, backdrop cards |
| ink | `#3c3c3c` | borders, body text, the status strip |
| nav dark | `#1e1e2a` | headlines, the Settings nav tab |
| sticky yellow | `#fbe05d` | notes, "Swipe" chip, highlighted control |
| sticky coral | `#ff7c8f` | notes |
| sticky blue | `#96c3f7` | notes, the Apps nav tab |
| sticky green | `#c0ff91` | notes |
| purple | `#8b5cf6` | the add-note "+" button only |
| slate | `#cbd5e1` | group chips |

Background: the app's grid-paper texture (`assets/img/background.jpg`) under an 82%
surface wash, so the grid is visible but quiet. No gradients, no other backgrounds.

Text on a sticky colour is black. Labels and secondary text are `#334155` or `#475569`,
never lighter: light grey text fails contrast on the surface colour.

## Type

- **Geomini** (700 for headlines and the wordmark, 400 for group chips): display font.
- **Google Sans Flex** (500 body, 600 for emphasis): everything else.
- Both are copied from the app's own packages by `new-post.sh`. Never link a font CDN.

| Element | Size / line height |
|---|---|
| Cover title | 150 / 150, Geomini 700 |
| Content headline | 78 / 88; drop to 70 / 80 or 64 / 74 for three or four lines |
| Supporting line | 38 / 50, weight 500 |
| Note text | 28 / 38, weight 500 |
| Labels | 24–26, weight 500–600 |
| Footer | 28 / 36 |

Mixed case with a full stop on headlines. No all-caps, no exclamation marks. Emoji only
where the user's own text has them, in supporting lines (wrap in `<span class="emo">`,
font "Noto Color Emoji"), never added by Claude and never in a Geomini headline.

## Shape

- Square corners everywhere. The only rounded things are the note checkbox, colour
  swatches and the phone frame around a mobile screenshot.
- Hard offset shadow, no blur: `3px 7px 0 0 rgba(0,0,0,.2)`; larger blocks
  `5px 11px 0 0 rgba(0,0,0,.2)`.
- Thick ink borders on chips and controls (5–7px). Thin `#d4d4d4` 2px border only on
  backdrop cards.
- A group chip overlaps the top-left of its backdrop card (negative top margin). That
  overlap is the app's signature; keep it.

## Every slide has

- **Logo row** (`.brand`): logo image + "Taskodoro" wordmark on the left, page chip
  "n / total" (`.pg`) on the right.
- **Footer** (`.foot`): only a yellow "Swipe →" chip, right-aligned. No text label on
  the left (the user removed the post title and tagline from it). The last slide has no
  Swipe chip.

## Slide patterns

1. **Cover** (approved): huge two-line title, one-line subtitle, then three overlapping
   sticky squares (blue, coral, yellow) numbered 1–3 and slightly rotated.
2. **Point slide**: headline directly under the logo row (no number box), optional
   supporting line, then one visual pushed to the bottom with `margin-top: auto`.
3. **Screenshot slide**: for "how the app looks". Desktop screenshot in a square
   `.shot` frame at the left, mobile screenshot in a `.shot.phone` frame overlapping at
   the right, with "Desktop" and "Mobile" chips. Use real screenshots
   (`app-screenshots.sh`), not recreated UI.
4. **Closing**: centred logo, "Taskodoro", "Your comfort planner." Nothing else.

## Components in the template

| Class | What it is |
|---|---|
| `.chip` | group chip (slate, ink border, Geomini) |
| `.backdrop` | light card behind a group's notes; put it right after a `.chip` |
| `.note` + `.yellow/.coral/.blue/.green` | a note card; `.txt` for its text |
| `.ck` | note checkbox: ring image, plus `.tick` image when checked; `.done` strikes the text |
| `.counter` | counter note control (+ / value / −) |
| `.li` | checklist row inside a list note |
| `.strip` | dark status strip under a note, text in the note's colour |
| `.fld` (`.lb`, `.sel`) | a settings dropdown with its label |
| `.later` | plain white chip for a list of feature names |
| `.navpill` | the Home / Settings / Apps bar |
| `.sw` | colour swatch circle; `.on` adds the selected ring |
| `.addbtn` in `.hd` | purple "+" next to a group chip |
| `.shot`, `.shot.phone` | frames for screenshots |
| `.sq` | big numbered sticky square (cover) |

## Content rules

- One idea per slide. A headline over four lines is too long: shorten it or split it.
- Show the app's real pieces. No stock imagery, icons from other sets, or abstract shapes.
- Sample note text should be ordinary life tasks ("Call the dentist"), short enough for
  one line, and never real personal data.
- A colour class placed on an element that already sets `background` in its own class
  will lose; set the colour with an inline `style="background: var(--yellow)"` instead.
