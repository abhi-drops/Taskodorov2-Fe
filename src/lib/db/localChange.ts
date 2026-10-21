/**
 * A plain module-level pub/sub that mutating CRUD functions call after writing, so the
 * sync engine can debounce a push shortly after any local edit (`docs/phase3-sync-plan-from-be.md`
 * §10 item 3). Deliberately not a React context — `lib/db/*` must stay React-free (it's
 * also used from `lib/templates/*` and `sqlite.ts`, neither of which import React).
 */

type Listener = () => void

const listeners = new Set<Listener>()

/** Returns an unsubscribe function. */
export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyLocalChange(): void {
  for (const listener of listeners) listener()
}
