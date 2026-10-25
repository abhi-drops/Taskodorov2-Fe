/** `GET /app/update-check` response — see `docs/feat-app-update-check-from-be.md`. */
export type UpdateCheckResponse =
  | { updateAvailable: false }
  | {
      updateAvailable: true
      latestVersion: string
      latestVersionCode: number
      downloadUrl: string
      releaseNotes: string
      forceUpdate: boolean
    }
