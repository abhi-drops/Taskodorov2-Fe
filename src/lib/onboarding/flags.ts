import { useSyncExternalStore } from 'react'
import { getAllFlags, setFlag, setFlags } from '../db/userState'
import { BOARD_TOUR_SEEN_KEY, INTRO_SEEN_KEY } from '../db/userStateSchema'

/**
 * In-memory mirror of the `user_state` onboarding flags, so components read them
 * synchronously and a flag set now is visible on the next render (the DB write follows).
 * Same shape as `lib/platform/mobileWebNoticeState.ts`: a module store, not a provider,
 * because `lib/db/*` is the source of truth and needs no React above it.
 * See `docs/feat-onboarding.md`.
 */
export interface FlagsState {
  loaded: boolean
  flags: Record<string, boolean>
}

let state: FlagsState = { loaded: false, flags: {} }
const listeners = new Set<() => void>()

function set(next: FlagsState) {
  state = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFlags(): FlagsState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/**
 * Reads the flags from SQLite; also called after a sync pull wrote something, since the
 * account's flags may have just arrived. A DB failure must never trap the user in an
 * onboarding that cannot record progress, so it is treated as "everything already seen".
 */
export async function loadFlags(): Promise<void> {
  try {
    set({ loaded: true, flags: await getAllFlags() })
  } catch (err) {
    console.error('Failed to load onboarding flags:', err)
    set({ loaded: true, flags: { [INTRO_SEEN_KEY]: true, [BOARD_TOUR_SEEN_KEY]: true } })
  }
}

export function markFlag(key: string, value = true): void {
  set({ ...state, flags: { ...state.flags, [key]: value } })
  setFlag(key, value).catch((err) => console.error('Failed to save onboarding flag:', err))
}

/** Clears the given flags in one write (Settings' "Replay intro" / "Reset tips"). */
export function clearFlags(keys: string[]): void {
  const flags = { ...state.flags }
  for (const key of keys) flags[key] = false
  set({ ...state, flags })
  setFlags(keys, false).catch((err) => console.error('Failed to reset onboarding flags:', err))
}
