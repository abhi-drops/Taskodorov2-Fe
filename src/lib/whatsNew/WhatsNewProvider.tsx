import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { getAppInfo } from '../platform/nativeAppInfo'
import { releaseNotesApi } from '../api/appVersion'
import { loadLastSeenVersionCode, saveLastSeenVersionCode } from '../storage/preferences'
import { WhatsNewContext, type WhatsNewDialogState } from './whatsNewContext'

/**
 * Decides once per launch whether to show "What's new" (`docs/feat-release-notes-from-
 * be.md` §4.B), and serves the Settings row that reopens it. Not gated on sign-in.
 *
 * A fresh install records the current `versionCode` and shows nothing; a build newer than
 * the recorded one fetches the notes in between and opens the dialog. The recorded value is
 * saved when the dialog is *closed* (so a crash while it's up shows it again), immediately
 * when there's nothing worth showing, and not at all when the fetch fails (retry next launch).
 */
export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<WhatsNewDialogState | null>(null)
  const [checking, setChecking] = useState(true)
  const [browseStatus, setBrowseStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true
    void (async () => {
      try {
        const { platform, versionCode } = await getAppInfo()
        const stored = await loadLastSeenVersionCode()
        if (stored === null) {
          await saveLastSeenVersionCode(versionCode)
          return
        }
        if (versionCode <= stored) return
        const { notes } = await releaseNotesApi.get({ platform, since: stored, upTo: versionCode })
        if (notes.length === 0) {
          await saveLastSeenVersionCode(versionCode)
          return
        }
        setDialog({ notes, seenVersionCode: versionCode })
      } catch {
        // Offline or backend down: keep the stored value and try again next launch.
      } finally {
        setChecking(false)
      }
    })()
  }, [])

  const openLatest = useCallback(async () => {
    setBrowseStatus('loading')
    try {
      const { platform, versionCode } = await getAppInfo()
      const { notes } = await releaseNotesApi.get({ platform, upTo: versionCode })
      setDialog({ notes, seenVersionCode: null })
      setBrowseStatus('idle')
    } catch {
      setBrowseStatus('error')
    }
  }, [])

  const close = useCallback(() => {
    if (dialog?.seenVersionCode != null) void saveLastSeenVersionCode(dialog.seenVersionCode).catch(() => {})
    setDialog(null)
  }, [dialog])

  return (
    <WhatsNewContext.Provider
      value={{ dialog, pending: checking || dialog !== null, browseStatus, openLatest, close }}
    >
      {children}
    </WhatsNewContext.Provider>
  )
}
