import { createContext } from 'react'
import type { UpdateCheckResponse } from '../../types/appVersion'

export type AppUpdateStatus = 'disabled' | 'idle' | 'checking' | 'error'

export interface AppUpdateContextValue {
  /** 'disabled' on web — this feature never runs there (see `nativeAppInfo.ts`). */
  status: AppUpdateStatus
  /** `null` until the first check resolves. */
  result: UpdateCheckResponse | null
  /** This install's own `versionName` (e.g. "1.0"), for display — `null` on web/before
   * the first check. */
  currentVersionName: string | null
  /** True once the dismissible (non-`forceUpdate`) banner has been dismissed for the
   * *current* `result` — reset on every fresh `checkNow()`, not persisted across app
   * launches (by design: no "don't show again" storage, see `feat-app-update-check-
   * from-be.md`). */
  bannerDismissed: boolean
  checkNow(): Promise<void>
  dismissBanner(): void
}

export const AppUpdateContext = createContext<AppUpdateContextValue | undefined>(undefined)
