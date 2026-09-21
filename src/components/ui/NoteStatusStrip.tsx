import { useLayoutEffect, useRef, useState } from 'react'
import { getLatestStatus } from '../../lib/notes/noteStatus'
import { SWATCH_TEXT_CLASSES, type SwatchColor } from './swatchColors'
import type { NoteStatus } from '../../types/note'

interface NoteStatusStripProps {
  statuses: NoteStatus[]
  color: SwatchColor
}

/**
 * Full-bleed footer strip on a note card showing only the latest status. Overflow is
 * measured in JS (against a hidden, undoubled copy of the text) rather than detected in
 * pure CSS, so short text can stay static/right-aligned instead of always animating —
 * measuring the animated/duplicated markup directly would always read as overflowing.
 * Text is tinted to the note's own swatch color (not a fixed gray) so the strip visually
 * ties back to the card it's attached to.
 */
export function NoteStatusStrip({ statuses, color }: NoteStatusStripProps) {
  const latest = getLatestStatus(statuses)
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const textColorClass = SWATCH_TEXT_CLASSES[color]

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return
    setOverflowing(measure.scrollWidth > container.clientWidth)
  }, [latest?.text])

  if (!latest) return null

  return (
    <div ref={containerRef} className="w-full overflow-hidden bg-ink px-3 py-1.5">
      <span ref={measureRef} className="invisible absolute whitespace-nowrap text-sm">
        {latest.text}
      </span>
      {overflowing ? (
        <div className="flex w-max animate-marquee gap-8">
          <span className={`whitespace-nowrap text-sm font-semibold ${textColorClass}`}>{latest.text}</span>
          <span aria-hidden="true" className={`whitespace-nowrap text-sm font-semibold ${textColorClass}`}>
            {latest.text}
          </span>
        </div>
      ) : (
        <span className={`block truncate text-right text-sm font-semibold ${textColorClass}`}>{latest.text}</span>
      )}
    </div>
  )
}
