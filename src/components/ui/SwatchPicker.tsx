import { SWATCH_OPTIONS, SWATCH_CLASSES } from './swatchColors'
import type { SwatchColor } from './swatchColors'

interface SwatchPickerProps {
  value: SwatchColor | null
  onChange: (color: SwatchColor) => void
  disabled?: boolean
  className?: string
}

export function SwatchPicker({ value, onChange, disabled = false, className = '' }: SwatchPickerProps) {
  return (
    <div
      className={`flex items-center gap-3 ${disabled ? 'pointer-events-none opacity-35' : ''} ${className}`}
      role="radiogroup"
    >
      {SWATCH_OPTIONS.map((color) => {
        const isSelected = color === value
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full transition ${SWATCH_CLASSES[color]} ${
              isSelected ? 'ring-2 ring-nav-dark ring-offset-2' : ''
            }`}
          />
        )
      })}
    </div>
  )
}
