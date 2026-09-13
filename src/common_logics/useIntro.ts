import { useEffect, useState } from 'react'
import { hasSeenIntro, markIntroSeen } from '../lib/storage/preferences'

export function useIntro() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const seen = await hasSeenIntro()
      if (!cancelled && !seen) setIsOpen(true)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setIsOpen(false)
    markIntroSeen()
  }

  return { isOpen, dismiss }
}
