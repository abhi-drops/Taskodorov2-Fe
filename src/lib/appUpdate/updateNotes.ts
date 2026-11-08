import type { ReleaseNote, UpdateCheckResponse } from '../../types/appVersion'

/**
 * The notes to show for an available update: the response's `notes`, or — from a backend
 * that predates them, or when every missed release had empty notes — the latest release's
 * `releaseNotes` as a single block. Empty when there is nothing to show.
 */
export function getUpdateNotes(result: Extract<UpdateCheckResponse, { updateAvailable: true }>): ReleaseNote[] {
  const notes = result.notes ?? []
  if (notes.length > 0) return notes
  const fallback = result.releaseNotes?.trim()
  return fallback
    ? [{ version: result.latestVersion, versionCode: result.latestVersionCode, notesMd: fallback }]
    : []
}
