import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { isNative } from '../platform/isNative'
import { getAppInfo } from '../platform/nativeAppInfo'
import { appVersionApi } from '../api/appVersion'
import { AppUpdateContext, type AppUpdateStatus } from './appUpdateContext'
import type { UpdateCheckResponse } from '../../types/appVersion'

/** A web tab can stay open for days, so it re-checks when it regains focus — at most this often. */
const WEB_RECHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * Checks `/app/update-check` once per app launch on both platforms (the web build has its
 * own `versionCode`, see `docs/feat-release-notes-from-be.md`), and exposes a manual
 * `checkNow()` for Settings' native "Check for Update" row. Mirrors `lib/sync/
 * SyncContext.tsx`'s shape (one provider mounted once in `App.tsx`, a status + a manual
 * trigger). Native keeps its once-per-launch behaviour; web additionally re-checks when the
 * tab becomes visible again, throttled to once per 30 minutes. Nothing persists across launches.
 */
export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppUpdateStatus>('idle')
  const [result, setResult] = useState<UpdateCheckResponse | null>(null)
  const [currentVersionName, setCurrentVersionName] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const hasAutoCheckedRef = useRef(false)
  const lastCheckAtRef = useRef(0)
  const resultRef = useRef<UpdateCheckResponse | null>(null)

  const runCheck = useCallback(async (background: boolean) => {
    lastCheckAtRef.current = Date.now()
    setStatus('checking')
    try {
      const info = await getAppInfo()
      setCurrentVersionName(info.versionName)
      const response = await appVersionApi.check(info.versionCode, info.platform)
      // A background re-check that finds the release the user already dismissed must not
      // bring the banner back; a manual check always does.
      const previous = resultRef.current
      const sameRelease =
        background &&
        previous?.updateAvailable === true &&
        response.updateAvailable &&
        previous.latestVersionCode === response.latestVersionCode
      resultRef.current = response
      setResult(response)
      if (!sameRelease) setBannerDismissed(false)
      setStatus('idle')
    } catch {
      // Offline, backend down, whatever — this is a nice-to-have nudge, not a gate the
      // app's usability depends on. The manual "Check for Update" row in Settings reads
      // `status === 'error'` to tell the user it didn't go through; the auto-check below
      // has nothing watching `status` for this, so it fails silently there.
      setStatus('error')
    }
  }, [])

  const checkNow = useCallback(() => runCheck(false), [runCheck])

  useEffect(() => {
    if (hasAutoCheckedRef.current) return
    hasAutoCheckedRef.current = true
    void runCheck(false)
  }, [runCheck])

  useEffect(() => {
    if (isNative()) return
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastCheckAtRef.current < WEB_RECHECK_INTERVAL_MS) return
      void runCheck(true)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [runCheck])

  const dismissBanner = useCallback(() => setBannerDismissed(true), [])

  return (
    <AppUpdateContext.Provider
      value={{ status, result, currentVersionName, bannerDismissed, checkNow, dismissBanner }}
    >
      {children}
    </AppUpdateContext.Provider>
  )
}
