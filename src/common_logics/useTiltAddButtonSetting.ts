import { useEffect, useState } from 'react'
import {
  loadTiltAddButtonEnabled,
  loadTiltAddButtonTravel,
  saveTiltAddButtonEnabled,
  saveTiltAddButtonTravel,
  type TiltTravelSixths,
} from '../lib/storage/preferences'

/**
 * The on-device "tilt to move the + button" preferences: on/off, and how far down it may
 * slide (`travel`, in sixths of the screen height). Both are `null` until the stored
 * values have loaded, so consumers can avoid starting sensors on a stale default.
 */
export function useTiltAddButtonSetting() {
  const [enabled, setEnabledState] = useState<boolean | null>(null)
  const [travel, setTravelState] = useState<TiltTravelSixths | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadTiltAddButtonEnabled(), loadTiltAddButtonTravel()]).then(([loadedEnabled, loadedTravel]) => {
      if (cancelled) return
      setEnabledState(loadedEnabled)
      setTravelState(loadedTravel)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setEnabled(value: boolean) {
    setEnabledState(value)
    void saveTiltAddButtonEnabled(value)
  }

  function setTravel(value: TiltTravelSixths) {
    setTravelState(value)
    void saveTiltAddButtonTravel(value)
  }

  return { enabled, setEnabled, travel, setTravel }
}
