/**
 * Things that should close on the Android back button before the app navigates back:
 * open modals. The newest one registered is the one a back press closes.
 *
 * A module-level stack, not React state: `useAndroidBackButton` reads it from a native
 * event listener, outside any render.
 */
const handlers: (() => void)[] = []

/** Registers a close function; returns the function that unregisters it. */
export function pushBackHandler(handler: () => void): () => void {
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }
}

/** Runs the newest handler, if any. Returns whether the back press was handled. */
export function runBackHandler(): boolean {
  const handler = handlers[handlers.length - 1]
  if (!handler) return false
  handler()
  return true
}
