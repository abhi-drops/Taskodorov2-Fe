import { feedbackApi } from '../api/feedback'
import { isNative } from '../platform/isNative'
import { getNativeAppInfo } from '../platform/nativeAppInfo'
import { saveFeedbackPromptState } from '../storage/preferences'

/** Rounds to the nearest 0.5 and clamps to [0, 5] — the backend's rule, applied here
 * first so its `400` is unreachable from this UI (see `docs/feat-feedback-from-be.md`). */
export function normalizeRating(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value * 2) / 2))
}

/** Throws on any failure (the caller shows one generic "try again" message). `platform`
 * and `appVersion` are best-effort: a failed version lookup never blocks the send. */
export async function submitFeedback(rating: number, comment: string): Promise<void> {
  const trimmed = comment.trim()
  const info = await getNativeAppInfo().catch(() => null)
  await feedbackApi.submit({
    rating: normalizeRating(rating),
    ...(trimmed ? { comment: trimmed } : {}),
    platform: isNative() ? 'android' : 'web',
    ...(info ? { appVersion: info.versionName } : {}),
  })
  // Whoever sent feedback (from Settings or the prompt) has no need to be asked for it.
  await saveFeedbackPromptState({ dontAskAgain: true, remindAt: null }).catch(() => {})
}
