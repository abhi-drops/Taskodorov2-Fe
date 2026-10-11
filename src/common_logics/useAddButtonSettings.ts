import { useEffect, useState } from 'react'
import {
  loadAddButtonPosition,
  loadTiltAddButtonEnabled,
  saveAddButtonPosition,
  saveTiltAddButtonEnabled,
  type AddButtonPosition,
} from '../lib/storage/preferences'
import { usePlatform } from '../lib/platform/usePlatform'

/**
 * The on-device settings for the mobile floating "+": `dynamic` (the "Dynamic Add
 * Button" switch) and its vertical `position`. Both are `null` until the stored values
 * have loaded, so consumers can avoid starting sensors on, or flashing, a stale default.
 *
 * `dynamic` needs the Android app: on web (the phone-sized mobile layout) it is always
 * `false` and `dynamicAvailable` is `false`, whatever is stored.
 */
export function useAddButtonSettings() {
  const { isNative } = usePlatform()
  const [dynamic, setDynamicState] = useState<boolean | null>(null)
  const [position, setPositionState] = useState<AddButtonPosition | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadTiltAddButtonEnabled(), loadAddButtonPosition()]).then(([loadedDynamic, loadedPosition]) => {
      if (cancelled) return
      setDynamicState(loadedDynamic)
      setPositionState(loadedPosition)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setDynamic(value: boolean) {
    setDynamicState(value)
    void saveTiltAddButtonEnabled(value)
  }

  function setPosition(value: AddButtonPosition) {
    setPositionState(value)
    void saveAddButtonPosition(value)
  }

  return {
    dynamic: isNative ? dynamic : false,
    dynamicAvailable: isNative,
    setDynamic,
    position,
    setPosition,
  }
}
