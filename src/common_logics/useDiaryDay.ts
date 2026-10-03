import { useEffect, useMemo, useState } from 'react'
import { addDays, isValid, parse, startOfDay } from 'date-fns'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { getDayTimeline } from '../lib/db/events'
import { buildDayReplay, type DayReplay } from '../lib/diary/replay'

/** How long each step lasts while playing. */
const PLAY_STEP_MS = 700

/** `yyyy-MM-dd` from the URL → a local-midnight `Date`, or null if it isn't a real date. */
export function parseDiaryDate(param: string | undefined): Date | null {
  if (!param) return null
  const date = parse(param, 'yyyy-MM-dd', new Date())
  return isValid(date) ? startOfDay(date) : null
}

/**
 * One Diary day: the replay frames (built once, so scrubbing never queries the DB), the
 * current frame, Play/Pause, and the note selected for the per-note sidebar.
 *
 * Opening a day lands on the **last frame**, the end-of-day board. Play restarts from
 * frame 0 when started at the end, and stops at the last frame.
 */
export function useDiaryDay(day: Date | null) {
  const { activeWorkspaceId } = useWorkspace()
  const dayTime = day?.getTime() ?? null
  const [replay, setReplay] = useState<DayReplay | null>(null)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (dayTime === null || !activeWorkspaceId) return
      const dayDate = new Date(dayTime)
      const source = await getDayTimeline(activeWorkspaceId, addDays(dayDate, 1).getTime())
      if (cancelled) return
      const built = buildDayReplay(source, dayDate)
      setReplay(built)
      setFrame(built.frames.length - 1)
      setPlaying(false)
      setSelectedNoteId(null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, dayTime])

  const lastFrame = replay ? replay.frames.length - 1 : 0

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setFrame((current) => {
        if (current >= lastFrame) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, PLAY_STEP_MS)
    return () => clearInterval(timer)
  }, [playing, lastFrame])

  function togglePlay() {
    if (playing) {
      setPlaying(false)
      return
    }
    if (frame >= lastFrame) setFrame(0)
    setPlaying(true)
  }

  /** Scrubbing by hand pauses playback, like a video player. */
  function scrubTo(next: number) {
    setPlaying(false)
    setFrame(Math.max(0, Math.min(lastFrame, next)))
  }

  const selectedFeed = useMemo(
    () => (replay && selectedNoteId ? replay.feed.filter((entry) => entry.noteId === selectedNoteId) : []),
    [replay, selectedNoteId],
  )

  return {
    loaded: replay !== null,
    replay,
    frame,
    currentFrame: replay?.frames[frame] ?? null,
    scrubTo,
    playing,
    togglePlay,
    selectedNoteId,
    setSelectedNoteId,
    selectedFeed,
  }
}
