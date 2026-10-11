import { useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { isNative } from './isNative'
import { useIsPhoneWidth } from './mobileLayout'

/**
 * - `isNative`: running inside the Capacitor app. Gate native APIs (haptics, the back
 *   button, the share sheet, native Google sign-in) on this, never on `isMobile`.
 * - `isMobile`: the mobile layout is showing, i.e. the native app or a phone-sized web
 *   window. Gate layout on this.
 */
export function usePlatform() {
  const isPhoneWidth = useIsPhoneWidth()
  return useMemo(
    () => ({ isNative: isNative(), isMobile: isNative() || isPhoneWidth, platform: Capacitor.getPlatform() }),
    [isPhoneWidth],
  )
}
