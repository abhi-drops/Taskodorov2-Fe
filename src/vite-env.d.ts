/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID_WEB: string
  readonly VITE_GOOGLE_CLIENT_ID_ANDROID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
