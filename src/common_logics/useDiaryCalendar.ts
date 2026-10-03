import { useEffect, useState } from 'react'
import { addMonths, startOfMonth } from 'date-fns'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { getMonthActivity } from '../lib/db/events'
import { bucketMonth, type DayCounts } from '../lib/diary/replay'

/**
 * Remembers the month being viewed across a Diary unmount/remount (opening a day and
 * coming back) for this session, the same way `useBoard` remembers its tab.
 */
let lastMonth: Date | null = null

/**
 * The Diary calendar: the visible month and per-day activity counts for it. One query
 * per visible month (not per day), bucketed into local days in `bucketMonth`.
 */
export function useDiaryCalendar() {
  const { activeWorkspaceId } = useWorkspace()
  const [month, setMonthState] = useState<Date>(() => lastMonth ?? startOfMonth(new Date()))
  const [counts, setCounts] = useState<Map<string, DayCounts>>(new Map())
  const [loaded, setLoaded] = useState(false)

  function setMonth(next: Date) {
    const normalized = startOfMonth(next)
    lastMonth = normalized
    setMonthState(normalized)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeWorkspaceId) {
        setCounts(new Map())
        setLoaded(true)
        return
      }
      const from = month.getTime()
      const to = addMonths(month, 1).getTime()
      const source = await getMonthActivity(activeWorkspaceId, from, to)
      if (cancelled) return
      setCounts(bucketMonth(source, from, to))
      setLoaded(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, month])

  return { month, setMonth, counts, loaded }
}
