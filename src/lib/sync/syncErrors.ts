import { ApiError } from '../../types/api'

export type SyncFailure = 'offline' | 'unauthorized' | 'rejected' | 'unknown'

/**
 * Classifies a failed sync call so the engine knows whether to just wait for the next
 * trigger (offline, rejected) or log the user out (unauthorized). Offline must never
 * block anything: a `fetch` network failure (no `.status`, typically a `TypeError`) or
 * the browser already reporting itself offline both count, so a device with no
 * connection simply retries on the next foreground/edit/`online` event/manual tap.
 */
export function classifySyncError(err: unknown): SyncFailure {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (err instanceof ApiError) {
    if (err.status === 401) return 'unauthorized'
    if (err.status === 400 || err.status === 413) return 'rejected'
    if (err.status === undefined) return 'offline'
    return 'unknown'
  }
  // Not an ApiError at all → `fetch` itself threw (network down, DNS failure, etc.).
  return 'offline'
}
