import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { isNative } from '../platform/isNative'
import { getNativeAppInfo } from '../platform/nativeAppInfo'
import { appVersionApi } from '../api/appVersion'
import { AppUpdateContext, type AppUpdateStatus } from './appUpdateContext'
import type { UpdateCheckResponse } from '../../types/appVersion'

/**
 * Checks `/app/update-check` once per app launch (native only — this is an Android-
 * distribution concern, see `docs/feat-app-update-check-from-be.md`), and exposes a
 * manual `checkNow()` for Settings' "Check for Update" row. Mirrors `lib/sync/
 * SyncContext.tsx`'s shape (one provider mounted once in `App.tsx`, a status + a
 * manual trigger), but simpler: no retry-on-foreground — a release only ships every so
 * often, so once per launch is enough, and nothing here persists across launches.
 */
export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppUpdateStatus>(isNative() ? 'idle' : 'disabled')
  const [result, setResult] = useState<UpdateCheckResponse | null>(null)
  const [currentVersionName, setCurrentVersionName] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const hasAutoCheckedRef = useRef(false)

  const checkNow = useCallback(async () => {
    if (!isNative()) return
    setStatus('checking')
    try {
      const info = await getNativeAppInfo()
      if (!info) {
        setStatus('idle')
        return
      }
      setCurrentVersionName(info.versionName)
      const response = await appVersionApi.check(info.versionCode)
      setResult(response)
      setBannerDismissed(false)
      setStatus('idle')
    } catch {
      // Offline, backend down, whatever — this is a nice-to-have nudge, not a gate the
      // app's usability depends on. The manual "Check for Update" row in Settings reads
      // `status === 'error'` to tell the user it didn't go through; the auto-check below
      // has nothing watching `status` for this, so it fails silently there.
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isNative() || hasAutoCheckedRef.current) return
    hasAutoCheckedRef.current = true
    checkNow()
  }, [checkNow])

  const dismissBanner = useCallback(() => setBannerDismissed(true), [])

  return (
    <AppUpdateContext.Provider
      value={{ status, result, currentVersionName, bannerDismissed, checkNow, dismissBanner }}
    >
      {children}
    </AppUpdateContext.Provider>
  )
}
