import { createContext } from 'react'
import type { UpdateCheckResponse } from '../../types/appVersion'

export type AppUpdateStatus = 'idle' | 'checking' | 'error'

export interface AppUpdateContextValue {
  status: AppUpdateStatus
  /** `null` until the first check resolves. */
  result: UpdateCheckResponse | null
  /** This build's own `versionName` (e.g. "1.0"), for display — `null` before the first
   * check starts. */
  currentVersionName: string | null
  /** True once the dismissible (non-`forceUpdate`) banner has been dismissed for the
   * *current* `result` — reset on every fresh manual `checkNow()`, not persisted across
   * app launches (by design: no "don't show again" storage, see `feat-app-update-check-
   * from-be.md`). A background web re-check that finds the same release keeps it. */
  bannerDismissed: boolean
  checkNow(): Promise<void>
  dismissBanner(): void
}

export const AppUpdateContext = createContext<AppUpdateContextValue | undefined>(undefined)
