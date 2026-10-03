import { useEffect, type RefObject } from 'react'
import { haptics } from '../platform/haptics'

/**
 * Tilt-driven size dynamics for a fixed-position element (the mobile floating "+").
 * It never moves; only its size changes, with a spring. See `docs/feat-navigation.md`
 * ("Dynamic Add Button").
 *
 * - **Idle shrink:** after `IDLE_MS` with nothing happening, it springs down to
 *   `IDLE_SCALE`, anchored at its right edge so it tucks into the screen edge.
 * - **Wake (roll left, or tilt down):** rolling the phone's left edge down past
 *   `WAKE_ROLL_DEG`, or tilting its bottom edge down past `WAKE_PITCH_DEG`, springs it
 *   back to full size and restarts the idle countdown.
 * - **Tuck (roll right):** rolling the right edge down past `TUCK_ROLL_DEG` while it's
 *   full size shrinks it immediately, then ignores wake triggers for `TUCK_WAKE_LOCK_MS`.
 *   It is edge-triggered: the roll has to relax under half the threshold before another
 *   tuck can fire.
 *
 * Roll is `deviceorientation`'s `gamma` and front-back tilt is `beta`. Each is
 * low-pass filtered against hand jitter and measured against its own baseline: the grip
 * when this mounted, slowly re-learned while the phone stays near it, so a new resting
 * grip doesn't count as a tilt.
 *
 * Size uses the individual CSS `scale` property with a CSS spring transition, so React
 * state isn't touched.
 */

/** Nothing happening for this long → shrink. */
const IDLE_MS = 8000
const IDLE_SCALE = 0.6
/** Rolling the left edge down this far past the grip baseline wakes it. */
const WAKE_ROLL_DEG = 12
/** Tilting the bottom edge down (phone more upright) this far past the grip baseline wakes it. */
const WAKE_PITCH_DEG = 12
/** Rolling the right edge down this far past the grip baseline tucks it away (shrinks). */
const TUCK_ROLL_DEG = 12
/** After a tuck, ignore every wake trigger for this long. */
const TUCK_WAKE_LOCK_MS = 1700
const SPRING_MS = 650
/** Low-pass time constant for raw sensor readings (s). */
const SENSOR_SMOOTHING_S = 0.08
/** Grip re-learning: only while within this many degrees of the baseline, over this long. */
const BASELINE_DRIFT_WINDOW_DEG = 10
const BASELINE_DRIFT_S = 15

/**
 * An underdamped spring (ζ = 0.45) sampled into a CSS `linear()` easing — overshoots
 * and settles, in both directions. Falls back to an overshooting cubic-bézier on
 * WebViews without `linear()` support.
 */
const SPRING_EASING = (() => {
  const zeta = 0.45
  const omega = 14
  const omegaD = omega * Math.sqrt(1 - zeta * zeta)
  const points: string[] = []
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * (SPRING_MS / 1000)
    const x =
      i === 40
        ? 1
        : 1 - Math.exp(-zeta * omega * t) * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t))
    points.push(x.toFixed(4))
  }
  const springLinear = `linear(${points.join(', ')})`
  return typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', springLinear)
    ? springLinear
    : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
})()

function wrapDegrees(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

/** The individual CSS `scale` property (Chromium 104+). */
function supportsIndividualScale() {
  return typeof CSS !== 'undefined' && (CSS.supports?.('scale', '1') ?? false)
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Low-pass filtered sensor angle plus a slowly re-learned "how I hold it" baseline. */
function createTiltAxis() {
  let smoothed: number | null = null
  let baseline: number | null = null
  let lastTime = 0

  return {
    sample(value: number, time: number) {
      const dt = smoothed === null ? 0 : Math.max(0, (time - lastTime) / 1000)
      if (smoothed === null) {
        smoothed = value
      } else {
        smoothed += wrapDegrees(value - smoothed) * (1 - Math.exp(-dt / SENSOR_SMOOTHING_S))
      }
      lastTime = time
      if (baseline === null) {
        baseline = smoothed
      } else {
        const d = wrapDegrees(smoothed - baseline)
        if (Math.abs(d) < BASELINE_DRIFT_WINDOW_DEG) baseline += d * (1 - Math.exp(-dt / BASELINE_DRIFT_S))
      }
    },
    /** Signed degrees away from the baseline, or 0 before the first reading. */
    delta() {
      return smoothed === null || baseline === null ? 0 : wrapDegrees(smoothed - baseline)
    },
    reset() {
      baseline = null
    },
  }
}

export function useTiltShrink(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      !enabled ||
      prefersReducedMotion() ||
      !supportsIndividualScale() ||
      typeof DeviceOrientationEvent === 'undefined'
    ) {
      el.style.scale = ''
      return
    }

    const roll = createTiltAxis() // gamma — roll-left wakes it, roll-right tucks it
    const pitch = createTiltAxis() // beta — tilt-down (bottom edge dips) wakes it
    let shrunk = false
    let lastActiveAt = performance.now()
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    /** Until this time (performance.now()), no wake trigger can grow it back. */
    let wakeLockedUntil = 0
    /** Edge-trigger for the roll-right tuck; re-armed once the roll relaxes. */
    let tuckArmed = true

    el.style.transformOrigin = '100% 50%'
    el.style.willChange = 'scale'
    el.style.transition = `scale ${SPRING_MS}ms ${SPRING_EASING}`
    el.style.scale = ''

    function scheduleIdleCheck(delay: number) {
      if (idleTimer !== null) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        idleTimer = null
        const idleFor = performance.now() - lastActiveAt
        if (idleFor >= IDLE_MS) shrink()
        else scheduleIdleCheck(IDLE_MS - idleFor)
      }, delay)
    }

    function shrink() {
      if (shrunk) return
      shrunk = true
      el!.style.scale = String(IDLE_SCALE)
      haptics.light()
    }

    /** Roll-right while full size → shrink now, and hold it shrunk for a while. */
    function tuck() {
      shrink()
      wakeLockedUntil = performance.now() + TUCK_WAKE_LOCK_MS
    }

    /** Roll-left or tilt-down → grow back if shrunk, and restart the idle countdown. */
    function wake() {
      // Just tucked away on purpose — ignore everything until the lock expires.
      if (performance.now() < wakeLockedUntil) return
      lastActiveAt = performance.now()
      if (shrunk) {
        shrunk = false
        el!.style.scale = ''
        haptics.medium()
      }
      // A pending check re-arms itself for the remaining time, so only arm when none is.
      if (idleTimer === null) scheduleIdleCheck(IDLE_MS)
    }

    function isLandscape() {
      return window.innerWidth > window.innerHeight
    }

    function handleOrientation(event: DeviceOrientationEvent) {
      if (isLandscape()) return

      if (event.beta !== null) {
        pitch.sample(event.beta, event.timeStamp)
        // Positive beta delta = bottom edge down (phone more upright) → wake.
        if (pitch.delta() > WAKE_PITCH_DEG) wake()
      }

      if (event.gamma === null) return
      roll.sample(event.gamma, event.timeStamp)
      const rollDelta = roll.delta()
      // Negative gamma = left edge down → wake.
      if (rollDelta < -WAKE_ROLL_DEG) wake()
      // Positive = right edge down → tuck, if full size.
      if (rollDelta < TUCK_ROLL_DEG / 2) {
        tuckArmed = true
      } else if (rollDelta > TUCK_ROLL_DEG && tuckArmed && !shrunk) {
        tuckArmed = false
        tuck()
      }
    }

    // Rotating to landscape and back, or backgrounding the app, re-learns the grip rather
    // than reading the change as a huge roll.
    function resetBaselines() {
      roll.reset()
      pitch.reset()
    }

    function handleResize() {
      if (isLandscape()) resetBaselines()
    }

    function handleVisibility() {
      if (document.hidden) resetBaselines()
    }

    scheduleIdleCheck(IDLE_MS)
    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (idleTimer !== null) clearTimeout(idleTimer)
    }
  }, [ref, enabled])
}
