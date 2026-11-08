import { useSyncExternalStore } from 'react'

// Whether `MobileWebNotice` is on screen right now. Other dialogs that must not stack
// on top of it (What's new) read this and wait; it's a store rather than context because
// the notice owns its own state and has no provider above it.
let open = false
const listeners = new Set<() => void>()

export function setMobileWebNoticeOpen(next: boolean) {
  if (open === next) return
  open = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMobileWebNoticeOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false)
}
