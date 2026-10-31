import { Link } from 'react-router'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { SyncPendingIcon, SyncedIcon, SyncingIcon } from './ui/icons'
import { useSync } from '../lib/sync/useSync'
import type { AnimatedIconComponent } from './ui/AnimatedIcon'

type BadgeState = 'pending' | 'synced' | 'syncing'

const STATE_CONFIG: Record<BadgeState, { icon: AnimatedIconComponent; colorClass: string; label: string }> = {
  // "Not synced" covers everything that isn't actively syncing or caught up: never
  // signed in with Google, offline, a rejected/unauthorized push, or the first-sync
  // strategy choice still pending — all genuinely "not in sync right now."
  pending: { icon: SyncPendingIcon, colorClass: 'text-sticky-coral', label: 'Not synced' },
  synced: { icon: SyncedIcon, colorClass: 'text-sticky-blue', label: 'Synced' },
  syncing: { icon: SyncingIcon, colorClass: 'text-sticky-yellow', label: 'Syncing' },
}

function badgeState(status: ReturnType<typeof useSync>['status'], lastSyncedAt: number | null): BadgeState {
  if (status === 'syncing') return 'syncing'
  if (status === 'idle' && lastSyncedAt !== null) return 'synced'
  return 'pending'
}

/**
 * Small always-visible sync-status indicator: a dark circle with a tri-color icon
 * (coral = not synced, blue = synced, yellow = syncing, spinning). Sits to the left of
 * the header's search icon on both platforms (`HomePage.tsx`) so sync state is visible
 * from the board without a trip to Settings. Links to Settings' Account & Sync tab —
 * the one place to actually do anything about it (connect Google, pick a first-sync
 * strategy, retry).
 */
export function SyncStatusBadge() {
  const { status, lastSyncedAt } = useSync()
  const state = badgeState(status, lastSyncedAt)
  const { icon, colorClass, label } = STATE_CONFIG[state]

  return (
    <Link
      to="/settings?tab=account&focus=sync"
      aria-label={`Sync status: ${label}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink"
    >
      <AnimatedIcon
        icon={icon}
        size={16}
        still={state === 'syncing'}
        className={`${colorClass} ${state === 'syncing' ? 'animate-spin' : ''}`}
      />
    </Link>
  )
}
