import { Navigate, useNavigate, useParams } from 'react-router'
import { addDays, format, isToday } from 'date-fns'
import { DIARY_DETAILS_PANEL_KEY, DiaryHeader, DiaryShell } from '../components/DiaryShell'
import { DiaryReplayBoard } from '../components/DiaryReplayBoard'
import { DiaryCounts, DiaryFeedList } from '../components/DiarySidebar'
import { Scrubber } from '../components/ui/Scrubber'
import { SidePanel } from '../components/ui/SidePanel'
import { parseDiaryDate, useDiaryDay } from '../common_logics/useDiaryDay'
import { usePlatform } from '../lib/platform/usePlatform'
import { useTransitionReady } from '../lib/motion/pageTransitions'
import { useFillViewportHeight } from '../lib/layout/useFillViewportHeight'
import { dayKey, formatTimeOfDay } from '../lib/diary/replay'

/** Yellow square ‹ [SEP 15] › control from the wireframe. The date itself goes back to the month calendar. */
function DayStepper({ day }: { day: Date }) {
  const navigate = useNavigate()
  // Replace, not push: stepping through days shouldn't stack history, so back still
  // returns to the calendar in one step.
  const go = (next: Date) => navigate(`/apps/diary/${dayKey(next)}`, { replace: true, viewTransition: true })
  const square =
    'flex h-7 w-7 items-center justify-center rounded-card border-2 border-ink bg-sticky-yellow font-display text-sm font-bold leading-none text-ink shadow-card hover:opacity-90 disabled:opacity-40'
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" aria-label="Previous day" onClick={() => go(addDays(day, -1))} className={square}>
        ‹
      </button>
      <button
        type="button"
        onClick={() => navigate('/apps/diary', { viewTransition: true })}
        aria-label="Back to the month calendar"
        className="min-w-16 font-display text-sm font-bold uppercase text-nav-dark hover:underline"
      >
        {isToday(day) ? 'Today' : format(day, 'MMM d')}
      </button>
      <button
        type="button"
        aria-label="Next day"
        onClick={() => go(addDays(day, 1))}
        disabled={isToday(day) || day > new Date()}
        className={square}
      >
        ›
      </button>
    </div>
  )
}

/**
 * `/apps/diary/:date` (`yyyy-MM-dd`), one day of the Diary.
 * - Desktop: the replay. A scrubber (one stop per change, Play/Pause) drives a
 *   read-only board, and a sidebar shows the day's counts and changes. Clicking a feed
 *   entry jumps to its frame; clicking a card shows that note's changes for the day.
 * - Mobile: the day summary only (counts + list), no scrubber. Tapping an entry opens
 *   the note if it still exists.
 * See `docs/feat-diary.md`.
 */
export default function DiaryDayPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { isNative } = usePlatform()
  const day = parseDiaryDate(date)
  const diary = useDiaryDay(day)
  useTransitionReady(diary.loaded || day === null)
  // Desktop: the board panel takes exactly the rest of the screen (measured, so the page
  // itself never scrolls), and the details sidebar is capped to the same height.
  const [boardRef, boardHeight] = useFillViewportHeight<HTMLDivElement>()
  // Until the first measurement (one frame), a conservative guess that can't overflow.
  const fillHeight = boardHeight ?? 'calc(100svh - 18rem)'

  if (!day) return <Navigate to="/apps/diary" replace />

  const replay = diary.replay
  const openNote = (noteId: string) => navigate(`/notes/${noteId}/edit`, { viewTransition: true })

  if (isNative) {
    return (
      <DiaryShell>
        <DiaryHeader>
          <div className="ml-auto">
            <DayStepper day={day} />
          </div>
        </DiaryHeader>
        {replay && (
          <>
            <DiaryCounts counts={replay.counts} />
            {/* Same light backdrop card as the board's group columns and the desktop day
                sidebar, so the list reads as one panel instead of floating on the grid. */}
            <section className="flex flex-col gap-3 border border-neutral-300 bg-surface p-4 shadow-card">
              <h2 className="font-display text-sm font-bold text-nav-dark">Changes</h2>
              <DiaryFeedList
                feed={replay.feed}
                onSelect={(entry) => {
                  if (replay.liveNoteIds.has(entry.noteId)) openNote(entry.noteId)
                }}
              />
            </section>
          </>
        )}
      </DiaryShell>
    )
  }

  const selectedTitle =
    replay && diary.selectedNoteId
      ? (diary.currentFrame?.notes.find((n) => n.id === diary.selectedNoteId)?.title ??
        replay.feed.find((e) => e.noteId === diary.selectedNoteId)?.title)
      : null

  return (
    <DiaryShell wide>
      <DiaryHeader detailsToggle>
        {replay && (
          <Scrubber
            className="flex-1"
            frameCount={replay.frames.length}
            frame={diary.frame}
            onChange={diary.scrubTo}
            playing={diary.playing}
            onTogglePlay={diary.togglePlay}
            label={`Changes on ${format(day, 'MMMM d')}`}
          />
        )}
        {diary.currentFrame && (
          // Frame 0 is the board before any of the day's changes, not a real event time.
          <span className="w-16 shrink-0 text-right font-display text-xs text-slate-600">
            {diary.frame === 0 ? 'Start' : formatTimeOfDay(diary.currentFrame.time)}
          </span>
        )}
        <DayStepper day={day} />
      </DiaryHeader>

      {/* No flex gap: the details SidePanel owns it, so it closes when collapsed. */}
      <div className="flex items-start">
        {/* No padding here: it's inside the board's scroll box (DiaryReplayBoard).
            Measured height: fills the rest of the screen; the board scrolls inside. */}
        <div
          ref={boardRef}
          style={{ height: fillHeight }}
          className="min-w-0 flex-1 border border-neutral-300 bg-white"
        >
          {replay && diary.currentFrame && (
            <DiaryReplayBoard
              className="h-full"
              key={dayKey(day)}
              frame={diary.currentFrame}
              groupsById={replay.groupsById}
              selectedNoteId={diary.selectedNoteId}
              onSelectNote={diary.setSelectedNoteId}
            />
          )}
        </div>

        <SidePanel
          side="right"
          storageKey={DIARY_DETAILS_PANEL_KEY}
          label="Day details"
          defaultWidth={288}
          minWidth={220}
          maxWidth={560}
          openRequest={diary.selectedNoteId}
          // Same measured height as the board, so both end at the same line.
          maxHeight={fillHeight}
          panelClassName="flex flex-col gap-4 border border-neutral-300 bg-surface p-4 shadow-card"
        >
          {replay && diary.selectedNoteId ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 break-words font-display text-sm font-bold text-nav-dark">{selectedTitle}</h2>
                <button
                  type="button"
                  aria-label="Close note details"
                  onClick={() => diary.setSelectedNoteId(null)}
                  className="text-lg leading-none text-ink hover:opacity-70"
                >
                  ×
                </button>
              </div>
              <DiaryFeedList
                feed={diary.selectedFeed}
                frame={diary.frame}
                onSelect={(entry) => diary.scrubTo(entry.frame)}
                empty="No changes to this note on this day."
              />
              {replay.liveNoteIds.has(diary.selectedNoteId) && (
                // Primary action of the panel: the app's chip-button shape (ink border, hard
                // shadow) in sticky yellow, like the toolbar's other yellow controls.
                <button
                  type="button"
                  onClick={() => openNote(diary.selectedNoteId!)}
                  className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-ink bg-sticky-yellow px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-ink shadow-card transition hover:opacity-90 active:translate-y-px active:shadow-none"
                >
                  Open note
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </>
          ) : (
            replay && (
              <>
                <h2 className="font-display text-sm font-bold text-nav-dark">This day</h2>
                <DiaryCounts counts={replay.counts} />
                <DiaryFeedList feed={replay.feed} frame={diary.frame} onSelect={(entry) => diary.scrubTo(entry.frame)} />
              </>
            )
          )}
        </SidePanel>
      </div>
    </DiaryShell>
  )
}
