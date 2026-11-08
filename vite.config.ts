import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The web build's own version — bumped by hand per web release, like Android's
// `versionCode` in build.gradle. See `docs/feat-release-notes-from-be.md` §4.0.
const webVersion = JSON.parse(readFileSync(new URL('./web-version.json', import.meta.url), 'utf-8')) as {
  version: string
  versionCode: number
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(webVersion.version),
    __APP_VERSION_CODE__: webVersion.versionCode,
  },
})
