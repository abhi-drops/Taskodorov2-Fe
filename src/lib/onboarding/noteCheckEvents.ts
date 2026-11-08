/**
 * A module-level pub/sub for "a note just went from unchecked to checked", fired by
 * `applyOnCheckMove` (so every card and the editor are covered from one place). The
 * onboarding board tour waits on it for its "check the circle" step and the one-time
 * "why did that move" hint reads it. Not React state: `lib/notes` must stay React-free,
 * like `lib/db/localChange.ts`. See `docs/feat-onboarding.md`.
 */
export interface NoteCheckedEvent {
  noteId: string
  /** The group the note moved to, or `null` when the group has no "On Check Move To". */
  movedToGroupId: string | null
}

type Listener = (event: NoteCheckedEvent) => void

const listeners = new Set<Listener>()

/** Returns an unsubscribe function. */
export function onNoteChecked(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitNoteChecked(event: NoteCheckedEvent): void {
  for (const listener of listeners) listener(event)
}
