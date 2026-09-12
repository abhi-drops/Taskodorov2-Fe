import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { usePlatform } from './usePlatform'

const EXIT_CONFIRM_WINDOW_MS = 2000

export function useAndroidBackButton() {
  const { isNative } = usePlatform()
  const [showExitToast, setShowExitToast] = useState(false)
  const exitArmedRef = useRef(false)

  useEffect(() => {
    if (!isNative) return

    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
        return
      }

      if (exitArmedRef.current) {
        App.exitApp()
        return
      }

      exitArmedRef.current = true
      setShowExitToast(true)
      setTimeout(() => {
        exitArmedRef.current = false
        setShowExitToast(false)
      }, EXIT_CONFIRM_WINDOW_MS)
    })

    return () => {
      listenerPromise.then((listener) => listener.remove())
    }
  }, [isNative])

  return { showExitToast }
}
