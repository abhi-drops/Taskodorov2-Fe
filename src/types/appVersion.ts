/** One release's notes, markdown. Shared by `/app/update-check` and `/app/release-notes`. */
export interface ReleaseNote {
  version: string
  versionCode: number
  notesMd: string
}

/** `GET /app/update-check` response — see `docs/feat-app-update-check-from-be.md` and
 * `docs/feat-release-notes-from-be.md`. */
export type UpdateCheckResponse =
  | { updateAvailable: false }
  | {
      updateAvailable: true
      latestVersion: string
      latestVersionCode: number
      downloadUrl: string
      /** The latest release's notes alone — kept for already-shipped clients. */
      releaseNotes: string
      /** Every release after the caller's, newest first, at most 10; empty-note releases
       * left out. Read as `notes ?? []`: a backend that predates it omits the field. */
      notes: ReleaseNote[]
      forceUpdate: boolean
    }

/** `GET /app/release-notes` response. */
export interface ReleaseNotesResponse {
  notes: ReleaseNote[]
}
