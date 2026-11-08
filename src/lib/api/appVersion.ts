import { api } from './client'
import type { ReleaseNotesResponse, UpdateCheckResponse } from '../../types/appVersion'

/** No auth header needed — must work before sign-in, even before hydration finishes. */
export const appVersionApi = {
  check: (versionCode: number, platform = 'android') =>
    api.get<UpdateCheckResponse>(`/app/update-check?platform=${platform}&versionCode=${versionCode}`),
}

export const releaseNotesApi = {
  /** `since` is exclusive, `upTo` inclusive; both optional. Always sends `platform`
   * explicitly — the backend's default is `android`. */
  get: ({ platform, since, upTo }: { platform: string; since?: number; upTo?: number }) => {
    const params = new URLSearchParams({ platform })
    if (since !== undefined) params.set('since', String(since))
    if (upTo !== undefined) params.set('upTo', String(upTo))
    return api.get<ReleaseNotesResponse>(`/app/release-notes?${params}`)
  },
}
