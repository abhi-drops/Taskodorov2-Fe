export type SwatchColor = 'yellow' | 'coral' | 'blue' | 'green'

export const SWATCH_OPTIONS: SwatchColor[] = ['yellow', 'coral', 'blue', 'green']

export const SWATCH_CLASSES: Record<SwatchColor, string> = {
  yellow: 'bg-sticky-yellow',
  coral: 'bg-sticky-coral',
  blue: 'bg-sticky-blue',
  green: 'bg-sticky-green',
}
