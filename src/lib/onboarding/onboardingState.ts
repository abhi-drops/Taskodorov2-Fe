import { useSyncExternalStore } from 'react'
import { BOARD_TOUR_SEEN_KEY, INTRO_SEEN_KEY } from '../db/userStateSchema'
import { useFlags } from './flags'

/**
 * What the onboarding layer is showing right now. A module store like the flags (and
 * `mobileWebNoticeState.ts`) so the dialogs that must not stack on it can read it without
 * a provider. `OnboardingHost` is the only writer. See `docs/feat-onboarding.md`.
 */
export type OnboardingPhase = { kind: 'idle' } | { kind: 'intro' } | { kind: 'tour'; tourId: string }

const IDLE: OnboardingPhase = { kind: 'idle' }
let phase: OnboardingPhase = IDLE
const listeners = new Set<() => void>()

function set(next: OnboardingPhase) {
  phase = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function startIntro() {
  set({ kind: 'intro' })
}

export function startTour(tourId: string) {
  set({ kind: 'tour', tourId })
}

export function endPhase() {
  set(IDLE)
}

export function useOnboardingPhase(): OnboardingPhase {
  return useSyncExternalStore(subscribe, () => phase, () => IDLE)
}

/**
 * Whether the first-run sequence (intro, then the board tour) has the screen or is still
 * due. "What's new" and the feedback prompt wait on it rather than stacking. True before
 * the flags load too, so neither can flash up first. Feature tours and tips are not part
 * of this: they only start once nothing else is pending.
 */
export function useOnboardingPending(): boolean {
  const { loaded, flags } = useFlags()
  const current = useOnboardingPhase()
  return !loaded || !flags[INTRO_SEEN_KEY] || !flags[BOARD_TOUR_SEEN_KEY] || current.kind !== 'idle'
}
