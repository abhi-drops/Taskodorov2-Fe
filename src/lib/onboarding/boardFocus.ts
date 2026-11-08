/**
 * A module-level pub/sub that lets the board tour ask the board to show a group. On
 * mobile the board shows one group at a time (the tab strip), so after the tour's "check a
 * note" step the checked note would simply vanish from the tab the user is looking at.
 * `HomePage` (mobile only) subscribes and switches tab, the same way it already does after
 * a drag into another group. Desktop shows every column, so nothing subscribes there.
 * See `docs/feat-onboarding.md`.
 */
type Listener = (groupId: string) => void

const listeners = new Set<Listener>()

/** Returns an unsubscribe function. */
export function onShowGroupRequest(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function requestShowGroup(groupId: string): void {
  for (const listener of listeners) listener(groupId)
}
