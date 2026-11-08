import { App } from '@capacitor/app'
import { isNative } from './isNative'

export interface NativeAppInfo {
  /** Android's `versionCode` (`android/app/build.gradle`) — an integer that only ever
   * goes up. This is what `/app/update-check` compares against, never `versionName`. */
  versionCode: number
  /** Android's `versionName` — the display string shown to the user (e.g. "1.0"). */
  versionName: string
}

/** `null` on web — there's no native build to report. Use `getAppInfo()` when web
 * should be covered too (see `docs/feat-release-notes-from-be.md`). */
export async function getNativeAppInfo(): Promise<NativeAppInfo | null> {
  if (!isNative()) return null
  const info = await App.getInfo()
  return { versionCode: Number(info.build), versionName: info.version }
}

export interface AppInfo extends NativeAppInfo {
  /** The backend's `platform` value for this build. */
  platform: 'android' | 'web'
}

/** This build's identity on either platform: native from `App.getInfo()`, web from the
 * constants `vite.config.ts` bakes in from `web-version.json`. */
export async function getAppInfo(): Promise<AppInfo> {
  const native = await getNativeAppInfo()
  if (native) return { platform: 'android', ...native }
  return { platform: 'web', versionCode: __APP_VERSION_CODE__, versionName: __APP_VERSION__ }
}
