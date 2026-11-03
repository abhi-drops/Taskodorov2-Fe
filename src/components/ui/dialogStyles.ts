/**
 * The frosted-white dim and deeper offset shadow that `WorkspaceSwitcher` and
 * `ConfirmDialog` give their `Modal`, for dialogs that should match them. Pass as
 * `overlayClassName` / `panelClassName` (full replacements for `Modal`'s defaults).
 */
export const DIALOG_OVERLAY = 'bg-white/60 backdrop-blur-sm'
export const DIALOG_SHADOW = 'shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]'

/** The violet (primary) action button in a dialog: pass as `className` to `Button`, or
 * add to an `<a>` styled as one. The chips' ink border plus `shadow-card` — the shadow
 * alone is too faint to read against violet. Not for the white secondary button. */
export const DIALOG_PRIMARY_BUTTON = 'border-[3px] border-ink shadow-card'

/** Label above a control inside a dialog: the same look as `Select`'s own label. */
export const FIELD_LABEL = 'text-sm font-medium text-slate-700'

/** A text input in the chip shape, matching `Select`'s trigger. */
export const FIELD_INPUT =
  'w-full rounded-card border-[3px] border-ink bg-white px-3.5 py-2 font-medium text-ink shadow-card outline-none placeholder:font-normal placeholder:text-ink/50 focus:bg-sticky-yellow'
