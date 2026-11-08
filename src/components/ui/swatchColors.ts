export type SwatchColor = 'yellow' | 'coral' | 'blue' | 'green'

export const SWATCH_OPTIONS: SwatchColor[] = ['yellow', 'coral', 'blue', 'green']

export const SWATCH_CLASSES: Record<SwatchColor, string> = {
  yellow: 'bg-sticky-yellow',
  coral: 'bg-sticky-coral',
  blue: 'bg-sticky-blue',
  green: 'bg-sticky-green',
}

export const SWATCH_TINT_CLASSES: Record<SwatchColor, string> = {
  yellow: 'bg-sticky-yellow/15',
  coral: 'bg-sticky-coral/15',
  blue: 'bg-sticky-blue/15',
  green: 'bg-sticky-green/15',
}

// Note-status strips (the footer on a card, the editor's Status block, the Diary's status
// entries). Light theme: the dark `ink` strip with the note's own colour as text. Dark
// theme: a white strip tinted with a pale shade of the note's colour and grey text (an
// ink strip would vanish on the dark panel). Full literal class strings, one map per
// property, so Tailwind's scanner finds them.
export const SWATCH_STATUS_BG_CLASSES: Record<SwatchColor, string> = {
  yellow: 'bg-ink dark:bg-[color-mix(in_srgb,var(--color-sticky-yellow)_22%,white)]',
  coral: 'bg-ink dark:bg-[color-mix(in_srgb,var(--color-sticky-coral)_22%,white)]',
  blue: 'bg-ink dark:bg-[color-mix(in_srgb,var(--color-sticky-blue)_22%,white)]',
  green: 'bg-ink dark:bg-[color-mix(in_srgb,var(--color-sticky-green)_22%,white)]',
}

export const SWATCH_STATUS_TEXT_CLASSES: Record<SwatchColor, string> = {
  yellow: 'text-sticky-yellow dark:text-slate-600',
  coral: 'text-sticky-coral dark:text-slate-600',
  blue: 'text-sticky-blue dark:text-slate-600',
  green: 'text-sticky-green dark:text-slate-600',
}

export const SWATCH_STATUS_PLACEHOLDER_CLASSES: Record<SwatchColor, string> = {
  yellow: 'placeholder:text-sticky-yellow/60 dark:placeholder:text-slate-400',
  coral: 'placeholder:text-sticky-coral/60 dark:placeholder:text-slate-400',
  blue: 'placeholder:text-sticky-blue/60 dark:placeholder:text-slate-400',
  green: 'placeholder:text-sticky-green/60 dark:placeholder:text-slate-400',
}
