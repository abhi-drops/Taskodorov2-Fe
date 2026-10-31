import type { RefObject } from 'react'

/**
 * The shared "tape material" backdrop used behind both the desktop header (`AppShell`)
 * and the mobile sticky group-tab strip (`HomePage`) once scrolled — styled to read as
 * a strip of translucent tape laid over the page rather than a plain frosted panel,
 * four layers, bottom to top:
 * 1. `peekRef` (`useBlurredPeek`): the actual, manually-blurred page content behind
 *    the bar (`filter: blur()`, not `backdrop-filter` — see that hook's docs).
 * 2. A translucent `bg-white/45` wash over the blurred peek, so text/icons in the bar
 *    stay legible against it without hiding the blur entirely.
 * 3. `feTurbulence` grain (`tape-grain`, `mix-blend-overlay`): the slightly fibrous/
 *    bubbled texture of tape's adhesive side, generated inline (no image asset,
 *    consistent with this app's no-external-asset stance elsewhere).
 * 4. A diagonal multi-stop white gradient (`mix-blend-screen`) standing in for light
 *    refracting across the tape's surface, plus a 1px top highlight for the raised
 *    edge catching light.
 * All layers fade in together via the wrapper's opacity. The caller owns positioning
 * (`fixed`/`sticky`, `inset-0`/`top-0`, z-index) — this only fills whatever box it's
 * placed in.
 *
 * `blurPx`/`washOpacity` default to the desktop header's original values but are
 * tunable per caller: a flat-colored card (e.g. a list note's solid `sticky-blue` body)
 * blurs into a much more even, less convincing wash than the board's mixed, saturated
 * note colors do, and can still read as legible text underneath at the same blur/wash
 * strength that looks right over busier content — `HomePage`'s mobile tab strip uses
 * higher values for exactly this reason.
 */
export function TapeBackdrop({
  active,
  peekRef,
  blurPx = 24,
  washOpacity = 0.45,
}: {
  active: boolean
  peekRef: RefObject<HTMLDivElement | null>
  blurPx?: number
  washOpacity?: number
}) {
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div
        ref={peekRef}
        aria-hidden
        inert
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ filter: `blur(${blurPx}px)` }}
      />
      <div
        className="absolute inset-0 border-b border-neutral-300/80"
        style={{ backgroundColor: `rgba(255, 255, 255, ${washOpacity})` }}
      />
      <svg className="absolute inset-0 h-full w-full mix-blend-overlay opacity-[0.16]" aria-hidden>
        <filter id="tape-grain" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -0.4" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tape-grain)" />
      </svg>
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            'linear-gradient(115deg, transparent 15%, rgba(255,255,255,0.4) 32%, rgba(255,255,255,0.05) 42%, transparent 55%, rgba(255,255,255,0.22) 72%, transparent 85%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
    </div>
  )
}
