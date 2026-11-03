import { useEffect, useState } from 'react'
import { FeedbackDialog } from './FeedbackDialog'
import { useAppForeground } from '../lib/platform/useAppForeground'
import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import {
  getOrCreateInstalledAt,
  loadFeedbackPromptState,
  saveFeedbackPromptState,
} from '../lib/storage/preferences'

const DAY_MS = 24 * 60 * 60 * 1000

async function isPromptDue(): Promise<boolean> {
  const [installedAt, state] = await Promise.all([getOrCreateInstalledAt(), loadFeedbackPromptState()])
  if (state.dontAskAgain) return false
  return Date.now() >= (state.remindAt ?? installedAt + DAY_MS)
}

/**
 * Rendered from `App.tsx` (like `AppUpdateBanner`): asks for feedback once the install
 * is a day old, on launch and whenever the app comes back to the foreground. "Remind me
 * later" pushes the next ask a day out; "Don't ask again" (or having sent feedback) ends
 * it for good. See `docs/feat-feedback-from-be.md`.
 */
export function FeedbackPrompt() {
  const [open, setOpen] = useState(false)
  const { result } = useAppUpdate()
  const updateRequired = result?.updateAvailable === true && result.forceUpdate

  useEffect(() => {
    let cancelled = false
    isPromptDue().then((due) => {
      if (!cancelled && due) setOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [])
  useAppForeground(() => {
    isPromptDue().then((due) => {
      if (due) setOpen(true)
    })
  })

  async function handleClose(dontAskAgain: boolean) {
    setOpen(false)
    await saveFeedbackPromptState(
      dontAskAgain
        ? { dontAskAgain: true, remindAt: null }
        : { dontAskAgain: false, remindAt: Date.now() + DAY_MS },
    )
  }

  // A mandatory update modal has the screen; the prompt waits for the next evaluation.
  // Mounted only while open so each ask starts with a blank form.
  if (!open || updateRequired) return null
  return <FeedbackDialog isOpen mode="prompt" onClose={handleClose} />
}
