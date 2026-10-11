import { useSyncExternalStore } from 'react'
import { isNative } from './isNative'

/** Phone-sized windows only: tablets (640px and up) get the web layout as usual. */
export const PHONE_QUERY = '(max-width: 639px)'

const phoneQuery = () => window.matchMedia(PHONE_QUERY)

function subscribe(onChange: () => void) {
  const query = phoneQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Whether the window is phone-sized right now; re-renders when that changes (resize, rotation). */
export function useIsPhoneWidth(): boolean {
  return useSyncExternalStore(subscribe, () => phoneQuery().matches)
}

/**
 * Whether the mobile layout is showing: always in the native app, and on web in a
 * phone-sized window. For code outside React; components read `usePlatform().isMobile`.
 */
export const isMobileLayout = (): boolean => isNative() || phoneQuery().matches
