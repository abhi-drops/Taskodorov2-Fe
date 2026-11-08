import { useState } from 'react'
import { Markdown } from './ui/Markdown'
import type { ReleaseNote } from '../types/appVersion'

/**
 * One block per release, headed `v{version}`, newest first (the order the backend sends).
 * The latest is always open; with more than one, the older ones wait behind a "Show
 * earlier versions" toggle. Renders nothing for an empty list — the caller decides what
 * an empty state looks like.
 */
export function ReleaseNotesList({ notes }: { notes: ReleaseNote[] }) {
  const [showEarlier, setShowEarlier] = useState(false)
  if (notes.length === 0) return null

  const [latest, ...earlier] = notes
  return (
    <div className="flex flex-col gap-4">
      <NoteBlock note={latest} />
      {earlier.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowEarlier((v) => !v)}
            aria-expanded={showEarlier}
            className="self-start text-sm font-medium text-ink underline"
          >
            {showEarlier ? 'Hide earlier versions' : `Show earlier versions (${earlier.length})`}
          </button>
          {showEarlier && earlier.map((note) => <NoteBlock key={note.versionCode} note={note} />)}
        </>
      )}
    </div>
  )
}

function NoteBlock({ note }: { note: ReleaseNote }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-display text-base font-bold text-ink">v{note.version}</h3>
      <Markdown source={note.notesMd} />
    </section>
  )
}
