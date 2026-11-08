import { withDb } from './sqlite'

export interface OnboardingStats {
  /** Notes that exist (not deleted). */
  notes: number
  /** Times any note moved between groups, from the Diary log. */
  moves: number
}

/** The two counts the milestone tips are keyed on (`lib/onboarding/tips.ts`). */
export function getOnboardingStats(): Promise<OnboardingStats> {
  return withDb(async (db) => {
    const notes = await db.query('SELECT COUNT(*) AS n FROM notes WHERE deleted_at IS NULL')
    const moves = await db.query("SELECT COUNT(*) AS n FROM activity_events WHERE action = 'moved'")
    return {
      notes: ((notes.values?.[0] as { n: number } | undefined)?.n) ?? 0,
      moves: ((moves.values?.[0] as { n: number } | undefined)?.n) ?? 0,
    }
  })
}
