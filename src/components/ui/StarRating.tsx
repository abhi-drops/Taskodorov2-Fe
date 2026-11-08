import type { KeyboardEvent, MouseEvent } from 'react'
import { AnimatedIcon } from './AnimatedIcon'
import { StarIcon } from './icons'

interface StarRatingProps {
  /** 0–5 in steps of 0.5. */
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

const STARS = [1, 2, 3, 4, 5]
const STAR_SIZE = 36

/**
 * Five stars that register half steps: clicking the left half of a star gives `n - 0.5`,
 * the right half `n`. One `slider` for assistive tech (arrow keys move by 0.5) rather
 * than ten buttons.
 */
export function StarRating({ value, onChange, disabled = false, className = '' }: StarRatingProps) {
  function handleClick(e: MouseEvent<HTMLButtonElement>, star: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const isLeftHalf = e.clientX - rect.left < rect.width / 2
    onChange(isLeftHalf ? star - 0.5 : star)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(5, value + 0.5))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(0, value - 0.5))
    }
  }

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value} out of 5 stars`}
      aria-disabled={disabled}
      onKeyDown={disabled ? undefined : handleKeyDown}
      className={`flex justify-center gap-1 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${className}`}
    >
      {STARS.map((star) => {
        const fill = Math.min(1, Math.max(0, value - (star - 1)))
        return (
          <button
            key={star}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => handleClick(e, star)}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            className="relative shrink-0 disabled:cursor-not-allowed"
            style={{ width: STAR_SIZE, height: STAR_SIZE }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-hairline">
              <AnimatedIcon icon={StarIcon} size={STAR_SIZE} still />
            </span>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-fg [&_svg]:fill-sticky-yellow"
              style={{ width: `${fill * 100}%` }}
            >
              <span className="flex items-center justify-center" style={{ width: STAR_SIZE, height: STAR_SIZE }}>
                <AnimatedIcon icon={StarIcon} size={STAR_SIZE} still />
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
