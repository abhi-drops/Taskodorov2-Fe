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
