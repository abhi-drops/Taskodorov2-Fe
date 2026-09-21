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

export const SWATCH_TEXT_CLASSES: Record<SwatchColor, string> = {
  yellow: 'text-sticky-yellow',
  coral: 'text-sticky-coral',
  blue: 'text-sticky-blue',
  green: 'text-sticky-green',
}

// Placeholder-variant counterpart to SWATCH_TEXT_CLASSES — kept as its own map of full
// literal class strings (not built via string concatenation at the call site) so
// Tailwind's content scanner can actually find and generate these `placeholder:`
// combos; a runtime-only `` `placeholder:${SWATCH_TEXT_CLASSES[c]}` `` string would
// never appear in source text for the scanner to pick up.
export const SWATCH_PLACEHOLDER_TEXT_CLASSES: Record<SwatchColor, string> = {
  yellow: 'placeholder:text-sticky-yellow/60',
  coral: 'placeholder:text-sticky-coral/60',
  blue: 'placeholder:text-sticky-blue/60',
  green: 'placeholder:text-sticky-green/60',
}
