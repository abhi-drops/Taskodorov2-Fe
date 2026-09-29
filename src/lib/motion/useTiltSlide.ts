import { useEffect, type RefObject } from 'react'

/**
 * Slides a fixed-position element up/down the screen as the phone tilts, like a
 * physical puck on a tray: tip the phone's bottom edge down and it slides down, tip the
 * top edge down and it slides back up. See `docs/feat-navigation.md` ("Tilt to move").
 *
 * Model, per animation frame:
 * - Tilt is `deviceorientation`'s `beta` (front-back rotation), low-pass filtered to
 *   remove hand jitter, measured relative to a *baseline* — the angle the phone was held
 *   at when this mounted, slowly re-learned while the phone is only slightly off it, so
 *   a new resting grip stops counting as tilt.
 * - Tilt inside `DEADZONE_DEG` is ignored. Beyond it, acceleration follows gravity's
 *   component along the slope (`sin`), so response ramps smoothly rather than snapping.
 * - Velocity carries over between frames (inertia → natural ease-in), rolling drag
 *   always applies, and strong static friction applies once the tilt is back inside the
 *   deadzone, so it coasts to a stop (ease-out) and then *stays put* — no spring back.
 * - The ends of travel (its CSS position, and `maxCenterFraction` of the viewport
 *   height for its centre — user-selectable in Settings) give a
 *   soft, damped bump instead of a hard stop.
 *
 * Idle shrink: after `IDLE_MS` with no movement, the element springs down to
 * `IDLE_SCALE` (anchored at its right edge); it springs back to full size as soon as it
 * moves again, or when the phone is rolled left (`gamma`, same filtered-and-baselined
 * treatment as `beta`) past `WAKE_ROLL_DEG`. Then the idle countdown starts over.
 *
 * Position is written straight to the individual CSS `translate` property and size to
 * `scale` (so a CSS spring transition can run on size while position updates every
 * frame) — no React state per frame. **Not `transform`:** CSS composes these as
 * `translate · rotate · scale · transform`, so a `translateY` inside `transform` gets
 * multiplied by `scale` — shrinking to 60% would also pull the slide offset to 60%
 * and visibly jump the element up. `translate` sits outside `scale`, so it doesn't. The rAF loop sleeps whenever the element is
 * at rest and the phone is level.
 */

const DEADZONE_DEG = 4
const MAX_TILT_DEG = 30
/** px/s² at a 90° effective tilt — scaled by sin(tilt), so ~10° past the deadzone ≈ 520px/s². */
const GRAVITY_PX = 3000
const MAX_SPEED_PX = 900
/** Always-on rolling drag (1/s). */
const ROLLING_DRAG = 1.2
/** Extra friction once the tilt is back inside the deadzone (1/s) — the coast-to-stop. */
const REST_FRICTION = 5
const BOUNCE = 0.25
const MIN_BOUNCE_SPEED = 120
/** Low-pass time constant for raw sensor readings (s). */
const SENSOR_SMOOTHING_S = 0.08
/** Grip re-learning: only while within this many degrees of the baseline, over this long. */
const BASELINE_DRIFT_WINDOW_DEG = 10
const BASELINE_DRIFT_S = 15

/** No movement for this long → shrink. */
const IDLE_MS = 8000
const IDLE_SCALE = 0.6
/** Slower than this doesn't count as "moving" for the idle timer (px/s). */
const ACTIVE_SPEED_PX = 20
/** Rolling the left edge down this far past the grip baseline wakes it. */
const WAKE_ROLL_DEG = 12
const SPRING_MS = 650

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

/** Survives remounts (e.g. navigating away and back, or hiding during a drag). */
let savedOffset = 0

function wrapDegrees(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

/** Individual `translate`/`scale` properties (Chromium 104+) — required, see above. */
function supportsIndividualTransforms() {
  return typeof CSS !== 'undefined' && (CSS.supports?.('translate', '0 1px') ?? false)
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Low-pass filtered sensor angle plus a slowly re-learned "how I hold it" baseline.
 * Used for both `beta` (slide) and `gamma` (roll-left wake).
 */
function createTiltAxis() {
  let smoothed: number | null = null
  let baseline: number | null = null
  let lastTime = 0

  return {
    sample(value: number, time: number) {
      if (smoothed === null) {
        smoothed = value
      } else {
        const dt = Math.max(0, (time - lastTime) / 1000)
        smoothed += wrapDegrees(value - smoothed) * (1 - Math.exp(-dt / SENSOR_SMOOTHING_S))
      }
      lastTime = time
      if (baseline === null) baseline = smoothed
    },
    /** Signed degrees away from the baseline, or 0 before the first reading. */
    delta() {
      return smoothed === null || baseline === null ? 0 : wrapDegrees(smoothed - baseline)
    },
    drift(dt: number) {
      const d = this.delta()
      if (baseline !== null && Math.abs(d) < BASELINE_DRIFT_WINDOW_DEG) {
        baseline += d * (1 - Math.exp(-dt / BASELINE_DRIFT_S))
      }
    },
    reset() {
      baseline = null
    },
  }
}

/**
 * @param maxCenterFraction how far down the element's centre may travel, as a fraction
 *   of viewport height.
 */
export function useTiltSlide(ref: RefObject<HTMLElement | null>, enabled: boolean, maxCenterFraction: number) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      !enabled ||
      prefersReducedMotion() ||
      !supportsIndividualTransforms() ||
      typeof DeviceOrientationEvent === 'undefined'
    ) {
      el.style.translate = ''
      el.style.scale = ''
      return
    }

    const pitch = createTiltAxis() // beta — drives the slide
    const roll = createTiltAxis() // gamma — roll-left wakes it from idle
    let offset = savedOffset
    let velocity = 0
    let lastFrameTime = 0
    let frame: number | null = null
    let shrunk = false
    let lastActiveAt = performance.now()
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    el.style.transformOrigin = '100% 50%'
    el.style.willChange = 'translate, scale'
    el.style.transition = `scale ${SPRING_MS}ms ${SPRING_EASING}`
    el.style.scale = ''

    function scheduleIdleCheck(delay: number) {
      if (idleTimer !== null) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        idleTimer = null
        const idleFor = performance.now() - lastActiveAt
        if (idleFor >= IDLE_MS) {
          shrunk = true
          el!.style.scale = String(IDLE_SCALE)
        } else {
          scheduleIdleCheck(IDLE_MS - idleFor)
        }
      }, delay)
    }

    /** Something happened — grow back if shrunk, and restart the idle countdown. */
    function markActive() {
      lastActiveAt = performance.now()
      if (shrunk) {
        shrunk = false
        el!.style.scale = ''
      }
      // Only (re)arm when nothing's pending — a pending check re-arms itself for the
      // remaining time, so we don't churn setTimeout every frame while moving.
      if (idleTimer === null) scheduleIdleCheck(IDLE_MS)
    }

    function maxOffset() {
      // `offsetTop`/`offsetHeight` ignore transforms and `scale`, so the travel range
      // stays the same whether the element is shrunk or not.
      const centerTop = el!.offsetTop + el!.offsetHeight / 2
      return Math.max(0, window.innerHeight * maxCenterFraction - centerTop)
    }

    function isLandscape() {
      return window.innerWidth > window.innerHeight
    }

    function render() {
      el!.style.translate = `0 ${offset.toFixed(2)}px`
    }

    /** Signed effective tilt in degrees past the deadzone; positive = bottom edge down. */
    function effectiveTilt() {
      if (isLandscape()) return 0
      const delta = pitch.delta()
      const magnitude = Math.min(Math.abs(delta), MAX_TILT_DEG) - DEADZONE_DEG
      return magnitude > 0 ? Math.sign(delta) * magnitude : 0
    }

    function step(now: number) {
      frame = null
      // Clamp dt so a backgrounded tab or a long GC pause doesn't launch the element.
      const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 1 / 60
      lastFrameTime = now

      const tilt = effectiveTilt()
      pitch.drift(dt)
      roll.drift(dt)

      velocity += GRAVITY_PX * Math.sin((tilt * Math.PI) / 180) * dt
      velocity *= Math.exp(-(ROLLING_DRAG + (tilt === 0 ? REST_FRICTION : 0)) * dt)
      velocity = Math.max(-MAX_SPEED_PX, Math.min(MAX_SPEED_PX, velocity))
      offset += velocity * dt

      const max = maxOffset()
      if (offset < 0 || offset > max) {
        offset = offset < 0 ? 0 : max
        velocity = Math.abs(velocity) > MIN_BOUNCE_SPEED ? -velocity * BOUNCE : 0
      }

      if (Math.abs(velocity) > ACTIVE_SPEED_PX) markActive()

      savedOffset = offset
      render()

      if (Math.abs(velocity) > 0.5 || tilt !== 0) {
        frame = requestAnimationFrame(step)
      } else {
        velocity = 0
        lastFrameTime = 0 // sleep; next wake starts with a fresh dt
      }
    }

    function wake() {
      if (frame === null) frame = requestAnimationFrame(step)
    }

    function handleOrientation(event: DeviceOrientationEvent) {
      if (event.beta === null) return
      pitch.sample(event.beta, event.timeStamp)
      if (event.gamma !== null) {
        roll.sample(event.gamma, event.timeStamp)
        // Negative gamma = left edge down.
        if (!isLandscape() && roll.delta() < -WAKE_ROLL_DEG) markActive()
      }
      wake()
    }

    function handleResize() {
      // Rotating to landscape and back re-learns the grip rather than reading the
      // rotation itself as a huge tilt.
      if (isLandscape()) {
        pitch.reset()
        roll.reset()
      }
      offset = Math.min(offset, maxOffset())
      render()
    }

    function handleVisibility() {
      if (document.hidden) {
        pitch.reset()
        roll.reset()
      }
    }

    offset = Math.min(offset, maxOffset())
    render()
    scheduleIdleCheck(IDLE_MS)
    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (frame !== null) cancelAnimationFrame(frame)
      if (idleTimer !== null) clearTimeout(idleTimer)
    }
  }, [ref, enabled, maxCenterFraction])
}
