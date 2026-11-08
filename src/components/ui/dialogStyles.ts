/**
 * The frosted-white dim and deeper offset shadow that `WorkspaceSwitcher` and
 * `ConfirmDialog` give their `Modal`, for dialogs that should match them. Pass as
 * `overlayClassName` / `panelClassName` (full replacements for `Modal`'s defaults).
 */
export const DIALOG_OVERLAY = 'bg-surface/60 backdrop-blur-sm'
export const DIALOG_SHADOW = 'shadow-pop'

/** The violet (primary) action button in a dialog: pass as `className` to `Button`, or
 * add to an `<a>` styled as one. The chips' ink border plus `shadow-card` — the shadow
 * alone is too faint to read against violet. Not for the white secondary button. */
export const DIALOG_PRIMARY_BUTTON = 'border-[3px] border-ink shadow-card'

/** Label above a control inside a dialog: the same look as `Select`'s own label. */
export const FIELD_LABEL = 'text-sm font-medium text-body'

/** A text input in the chip shape, matching `Select`'s trigger. */
export const FIELD_INPUT =
  'w-full rounded-card border-[3px] border-line bg-field px-3.5 py-2 font-medium text-fg shadow-card outline-none placeholder:font-normal placeholder:text-fg/50 focus:bg-sticky-yellow focus:text-ink focus:placeholder:text-ink/50'
