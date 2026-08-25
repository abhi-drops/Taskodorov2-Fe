import { useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { isNative } from './isNative'

export function usePlatform() {
  return useMemo(
    () => ({ isNative: isNative(), platform: Capacitor.getPlatform() }),
    [],
  )
}
