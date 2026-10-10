import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

// Screenshot-only config, used by app-screenshots.sh. It renders the app's mobile
// (native) layout in a browser by answering isNative() with true. Everything that asks
// Capacitor directly (the SQLite layer in particular) still takes its web path, so the
// board loads normally. Never use this for a real build.
const root = path.resolve(__dirname, '../../../..')

export default defineConfig({
  root,
  cacheDir: path.resolve(root, 'node_modules/.vite-promo-mobile'),
  plugins: [
    {
      name: 'force-native-layout',
      enforce: 'pre',
      transform(_code, id) {
        if (id.replace(/\\/g, '/').endsWith('/src/lib/platform/isNative.ts')) {
          return { code: 'export const isNative = () => true', map: null }
        }
      },
    },
    react(),
    tailwindcss(),
  ],
})
