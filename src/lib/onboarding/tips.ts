import type { OnboardingStats } from '../db/onboardingStats'

/**
 * Soft progressive disclosure: once the user reaches a milestone, one quiet tip points at
 * the next feature. Nothing is hidden before that, and a tip is shown at most once ever
 * (its `flagKey`) and at most one per app session (`OnboardingHost`). Accepting a tip
 * navigates; the destination's own first-visit tour (`tours.ts`) does the explaining.
 * See `docs/feat-onboarding.md`.
 */
export interface Tip {
  id: string
  flagKey: string
  message: string
  actionLabel: string
  to: string
  when: (stats: OnboardingStats, ctx: { signedIn: boolean }) => boolean
}

/** In priority order: the first eligible, not-yet-shown tip wins. */
export const TIPS: Tip[] = [
  {
    id: 'group-rules',
    flagKey: 'tip.groupRules',
    message: 'Notes can move between groups on their own. You choose where each group sends them.',
    actionLabel: 'Open Settings',
    to: '/settings',
    when: (stats) => stats.moves >= 1,
  },
  {
    id: 'diary',
    flagKey: 'tip.diary',
    message: 'Every change you make is saved in your Diary. Replay any day.',
    actionLabel: 'Open Diary',
    to: '/apps/diary',
    when: (stats) => stats.moves >= 3,
  },
  {
    id: 'templates',
    flagKey: 'tip.templates',
    message: 'Starting a new board? Templates give a workspace its groups and rules in one tap.',
    actionLabel: 'See Templates',
    to: '/apps/templates',
    when: (stats) => stats.notes >= 8,
  },
  {
    id: 'sync',
    flagKey: 'tip.sync',
    message: 'Want these boards on your other devices too? Sync with Google is optional.',
    actionLabel: 'Set up sync',
    to: '/settings?focus=sync',
    when: (stats, ctx) => stats.notes >= 12 && !ctx.signedIn,
  },
]

export const ALL_TIP_FLAG_KEYS = TIPS.map((t) => t.flagKey)
