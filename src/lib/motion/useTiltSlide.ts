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
 * Position is written straight to `style.transform` (no React state per frame), and the
 * rAF loop sleeps whenever the element is at rest and the phone is level.
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

/** Survives remounts (e.g. navigating away and back, or hiding during a drag). */
let savedOffset = 0

function wrapDegrees(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * @param maxCenterFraction how far down the element's centre may travel, as a fraction
 *   of viewport height.
 */
export function useTiltSlide(ref: RefObject<HTMLElement | null>, enabled: boolean, maxCenterFraction: number) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!enabled || prefersReducedMotion() || typeof DeviceOrientationEvent === 'undefined') {
      el.style.transform = ''
      return
    }

    let offset = savedOffset
    let velocity = 0
    let smoothedBeta: number | null = null
    let baseline: number | null = null
    let lastSampleTime = 0
    let lastFrameTime = 0
    let frame: number | null = null

    function maxOffset() {
      // `offsetTop` of a `position: fixed` element is its CSS `top` in the viewport.
      const centerTop = el!.offsetTop + el!.offsetHeight / 2
      return Math.max(0, window.innerHeight * maxCenterFraction - centerTop)
    }

    function isLandscape() {
      return window.innerWidth > window.innerHeight
    }

    function render() {
      el!.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
    }

    /** Signed effective tilt in degrees past the deadzone; positive = bottom edge down. */
    function effectiveTilt() {
      if (smoothedBeta === null || baseline === null || isLandscape()) return 0
      const delta = wrapDegrees(smoothedBeta - baseline)
      const magnitude = Math.min(Math.abs(delta), MAX_TILT_DEG) - DEADZONE_DEG
      return magnitude > 0 ? Math.sign(delta) * magnitude : 0
    }

    function step(now: number) {
      frame = null
      // Clamp dt so a backgrounded tab or a long GC pause doesn't launch the element.
      const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 1 / 60
      lastFrameTime = now

      const tilt = effectiveTilt()

      if (smoothedBeta !== null && baseline !== null) {
        const delta = wrapDegrees(smoothedBeta - baseline)
        if (Math.abs(delta) < BASELINE_DRIFT_WINDOW_DEG) {
          baseline += delta * (1 - Math.exp(-dt / BASELINE_DRIFT_S))
        }
      }

      velocity += GRAVITY_PX * Math.sin((tilt * Math.PI) / 180) * dt
      velocity *= Math.exp(-(ROLLING_DRAG + (tilt === 0 ? REST_FRICTION : 0)) * dt)
      velocity = Math.max(-MAX_SPEED_PX, Math.min(MAX_SPEED_PX, velocity))
      offset += velocity * dt

      const max = maxOffset()
      if (offset < 0 || offset > max) {
        offset = offset < 0 ? 0 : max
        velocity = Math.abs(velocity) > MIN_BOUNCE_SPEED ? -velocity * BOUNCE : 0
      }

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
      const now = event.timeStamp
      if (smoothedBeta === null) {
        smoothedBeta = event.beta
      } else {
        const dt = Math.max(0, (now - lastSampleTime) / 1000)
        smoothedBeta += wrapDegrees(event.beta - smoothedBeta) * (1 - Math.exp(-dt / SENSOR_SMOOTHING_S))
      }
      lastSampleTime = now
      if (baseline === null) baseline = smoothedBeta
      wake()
    }

    function handleResize() {
      // Rotating to landscape and back re-learns the grip rather than reading the
      // rotation itself as a huge tilt.
      if (isLandscape()) baseline = null
      offset = Math.min(offset, maxOffset())
      render()
    }

    function handleVisibility() {
      if (document.hidden) baseline = null
    }

    offset = Math.min(offset, maxOffset())
    render()
    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [ref, enabled, maxCenterFraction])
}
