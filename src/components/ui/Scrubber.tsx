import * as Slider from '@radix-ui/react-slider'

/**
 * Generic frame scrubber, a "video player" timeline: a Radix Slider (accessible, with
 * smooth touch/mouse drag and arrow-key stepping) styled to the Diary wireframe. It has
 * an ink track, a yellow round thumb, a tick per frame and a Play/Pause button. Knows
 * nothing about the Diary: it just moves an integer `frame` within `[0, frameCount)`.
 */

interface ScrubberProps {
  frameCount: number
  frame: number
  onChange: (frame: number) => void
  playing: boolean
  onTogglePlay: () => void
  /** Accessible name for the slider. */
  label?: string
  className?: string
}

/** Above this, per-frame ticks would just be a solid smear; the track alone reads better. */
const MAX_TICKS = 120

export function Scrubber({
  frameCount,
  frame,
  onChange,
  playing,
  onTogglePlay,
  label = 'Timeline',
  className = '',
}: ScrubberProps) {
  const max = Math.max(frameCount - 1, 0)
  const disabled = max === 0

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-card border-2 border-ink bg-white text-ink shadow-card hover:bg-slate-50 disabled:opacity-40"
      >
        {playing ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <rect x="2" y="1.5" width="3" height="9" fill="currentColor" />
            <rect x="7" y="1.5" width="3" height="9" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path d="M3 1.5v9l7-4.5z" fill="currentColor" />
          </svg>
        )}
      </button>

      <Slider.Root
        value={[frame]}
        min={0}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={([value]) => onChange(value)}
        aria-label={label}
        className="relative flex h-7 min-w-0 flex-1 touch-none select-none items-center data-[disabled]:opacity-40"
      >
        <Slider.Track className="relative h-1.5 grow bg-ink">
          {max > 0 && max <= MAX_TICKS && (
            <div className="pointer-events-none absolute inset-x-0 -top-1.5 h-[18px]" aria-hidden="true">
              {Array.from({ length: max + 1 }, (_, i) => (
                <span
                  key={i}
                  className="absolute top-0 h-full w-px -translate-x-1/2 bg-ink/40"
                  style={{ left: `${(i / max) * 100}%` }}
                />
              ))}
            </div>
          )}
          <Slider.Range className="absolute h-full bg-ink" />
        </Slider.Track>
        <Slider.Thumb className="block h-5 w-5 cursor-grab rounded-full border-2 border-ink bg-sticky-yellow shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple active:cursor-grabbing" />
      </Slider.Root>
    </div>
  )
}
