/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID_WEB: string
  readonly VITE_GOOGLE_CLIENT_ID_ANDROID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** The web build's `versionName` / `versionCode`, baked in by `vite.config.ts` from the
 * repo-root `web-version.json`. Only meaningful on web — native reads its own build. */
declare const __APP_VERSION__: string
declare const __APP_VERSION_CODE__: number
