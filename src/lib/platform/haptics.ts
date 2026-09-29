import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * Fire-and-forget haptics. Native-only: every call is a silent no-op on web, and
 * failures (no vibrator, plugin missing from an old native build) are swallowed —
 * haptics are garnish, never worth an unhandled rejection.
 *
 * If you ever add `Haptics.selectionChanged()` here: on Android it does nothing unless
 * `selectionStart()` was called first (until `selectionEnd()`).
 */
const isNative = Capacitor.isNativePlatform()

function run(call: () => Promise<void>) {
  if (!isNative) return
  call().catch(() => {})
}

export const haptics = {
  light: () => run(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium: () => run(() => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy: () => run(() => Haptics.impact({ style: ImpactStyle.Heavy })),
}
