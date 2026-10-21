import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { isNative } from './isNative'

/**
 * Current foreground/background state, kept live — unlike `useAppForeground`, which only
 * fires a one-shot callback on the transition back in. Needed for anything that must stop
 * running while backgrounded (e.g. an interval timer), not just react to resuming.
 */
export function useIsAppForeground(): boolean {
  const [foreground, setForeground] = useState(true)

  useEffect(() => {
    if (isNative()) {
      const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
        setForeground(isActive)
      })
      return () => {
        listenerPromise.then((listener) => listener.remove())
      }
    }

    function handleVisibility() {
      setForeground(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return foreground
}
