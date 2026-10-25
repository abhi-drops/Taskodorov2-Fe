import { api } from './client'
import type { UpdateCheckResponse } from '../../types/appVersion'

/** No auth header needed — must work before sign-in, even before hydration finishes. */
export const appVersionApi = {
  check: (versionCode: number, platform = 'android') =>
    api.get<UpdateCheckResponse>(`/app/update-check?platform=${platform}&versionCode=${versionCode}`),
}
