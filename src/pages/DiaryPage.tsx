import { useNavigate } from 'react-router'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { Calendar } from '../components/ui/Calendar'
import { EditIcon, MovedIcon, PlusIcon } from '../components/ui/icons'
import { DayActivityChips, DiaryHeader, DiaryShell } from '../components/DiaryShell'
import { useDiaryCalendar } from '../common_logics/useDiaryCalendar'
import { useTransitionReady } from '../lib/motion/pageTransitions'
import { dayKey } from '../lib/diary/replay'

/**
 * `/apps/diary`: the Diary's landing page on both platforms, a month calendar with
 * Created / Moved / Changes chips per day. Tapping a day opens `/apps/diary/:date`:
 * the replay scrubber on desktop, a day summary on mobile. See `docs/feat-diary.md`.
 */
export default function DiaryPage() {
  const navigate = useNavigate()
  const { month, setMonth, counts, loaded } = useDiaryCalendar()
  useTransitionReady(loaded)

  return (
    <DiaryShell>
      <DiaryHeader />
      <Calendar
        month={month}
        onMonthChange={setMonth}
        onDayClick={(date) => navigate(`/apps/diary/${dayKey(date)}`, { viewTransition: true })}
        renderDay={(date) => {
          const c = counts.get(dayKey(date))
          return c ? <DayActivityChips {...c} /> : null
        }}
      />
      <div className="flex flex-wrap items-center gap-x-1 text-xs text-body">
        <AnimatedIcon icon={PlusIcon} size={12} still className="text-fg" /> created ·
        <AnimatedIcon icon={MovedIcon} size={12} still className="text-fg" /> moved ·
        <AnimatedIcon icon={EditIcon} size={12} still className="text-fg" /> edits, statuses &amp; deletions
      </div>
    </DiaryShell>
  )
}
