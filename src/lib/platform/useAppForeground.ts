import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { isNative } from './isNative'

/**
 * Runs `onForeground` whenever the app comes back to the front: `appStateChange` on
 * native (the Android app itself, same plugin `useAndroidBackButton` already uses),
 * `visibilitychange` on web (same API `useTiltShrink` already listens to, for an
 * unrelated reason). Branches on `isNative()`, like the rest of `lib/platform`, not
 * `isMobile` — this is a native-API-vs-web-API question, not a layout one.
 */
export function useAppForeground(onForeground: () => void): void {
  const callbackRef = useRef(onForeground)
  useEffect(() => {
    callbackRef.current = onForeground
  }, [onForeground])

  useEffect(() => {
    if (isNative()) {
      const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) callbackRef.current()
      })
      return () => {
        listenerPromise.then((listener) => listener.remove())
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') callbackRef.current()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])
}
