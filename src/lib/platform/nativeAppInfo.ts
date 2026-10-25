import { App } from '@capacitor/app'
import { isNative } from './isNative'

export interface NativeAppInfo {
  /** Android's `versionCode` (`android/app/build.gradle`) — an integer that only ever
   * goes up. This is what `/app/update-check` compares against, never `versionName`. */
  versionCode: number
  /** Android's `versionName` — the display string shown to the user (e.g. "1.0"). */
  versionName: string
}

/** `null` on web — there's no native build to report, and this is an Android-distribution
 * concern only (see `docs/feat-app-update-check-from-be.md`). */
export async function getNativeAppInfo(): Promise<NativeAppInfo | null> {
  if (!isNative()) return null
  const info = await App.getInfo()
  return { versionCode: Number(info.build), versionName: info.version }
}
