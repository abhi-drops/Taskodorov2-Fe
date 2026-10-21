import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { runSync, EDIT_SYNC_DEBOUNCE_MS } from './syncEngine'
import { onLocalChange } from '../db/localChange'
import { withDb, seedIfEmpty } from '../db/sqlite'
import { wipeSyncedData } from '../db/reset'
import { useAppForeground } from '../platform/useAppForeground'
import { useIsAppForeground } from '../platform/useIsAppForeground'
import { loadSyncState, clearSyncState, markPendingFreshLogin } from '../storage/preferences'
import { SyncContext } from './syncContext'
import type { SyncStatus } from './syncContext'
import type { SyncFailure } from './syncErrors'
import type { SyncStrategy } from '../../types/sync'

/**
 * Only polled while another device has synced within the last 90s (the backend's
 * `deviceActivity.otherDeviceActiveNow` — docs/phase3-sync-plan-from-be.md). A second
 * device existing somewhere but idle doesn't trigger this — that'd poll forever on a
 * multi-device account nobody's actively using. 10s, not 30s, specifically because this
 * only runs when there's a real chance of a live cross-device edit to catch.
 */
const ACTIVE_DEVICE_POLL_MS = 10_000

/** Everything but `'disabled'` — that one is derived from eligibility, never stored,
 *  so becoming ineligible never needs a `setState` call of its own (see below). */
type ProcessStatus = Exclude<SyncStatus, 'disabled'>

/**
 * Sync is gated specifically on having signed in with Google — not on any
 * authenticated session — per the product decision behind the "Sync With Google"
 * label staying as-is rather than being generalized.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [processStatus, setProcessStatus] = useState<ProcessStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [failure, setFailure] = useState<SyncFailure | null>(null)
  const [appliedAt, setAppliedAt] = useState(0)
  const [strategyPromptOpen, setStrategyPromptOpen] = useState(false)
  const [otherDeviceActiveNow, setOtherDeviceActiveNow] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasEligibleRef = useRef(false)
  const isForeground = useIsAppForeground()

  const eligible = auth.status === 'authenticated' && auth.authMethod === 'google'
  const token = auth.token
  const accountId = auth.user?.id ?? null
  // Never stored directly — becoming ineligible (logout, or a non-Google session)
  // just changes what this renders to, with no effect/setState needed to "reset" it.
  const status: SyncStatus = eligible ? processStatus : 'disabled'

  const trigger = useCallback(
    async (strategy?: SyncStrategy) => {
      if (!token || !accountId) return
      setProcessStatus('syncing')
      const result = await runSync({ token, accountId, strategy })
      if (result.outcome === 'synced') {
        setProcessStatus('idle')
        setLastSyncedAt(Date.now())
        setFailure(null)
        setStrategyPromptOpen(false)
        setOtherDeviceActiveNow(result.otherDeviceActiveNow)
        if (result.applied) setAppliedAt(Date.now())
      } else if (result.outcome === 'needs-strategy') {
        setProcessStatus('needs-strategy')
        setStrategyPromptOpen(true)
      } else {
        // 'failed'
        if (result.failure === 'unauthorized') await auth.logout()
        if (result.failure === 'rejected') {
          console.error('Sync push rejected by server — check payload/ownership rules.')
        }
        setProcessStatus(result.failure === 'offline' ? 'offline' : 'error')
        setFailure(result.failure)
      }
    },
    [token, accountId, auth],
  )

  // Becomes ineligible *after having been eligible* (a Google session logging out,
  // whether the user tapped "Log out" or a 401 forced it) → clear this device's
  // synced data and its cursor, then reseed the same starting board a fresh install
  // gets (`seedIfEmpty` — Workspace 1, Todo/In Progress/Completed), so the device
  // reads as "like a new user" rather than a blank board. Without the clear, switching
  // Google accounts on one device could silently upload (or even show) the previous
  // account's leftover notes as the new account's data, since the server's own 409
  // conflict check only fires when the new account already has cloud data elsewhere;
  // a brand-new account had nothing to catch it with.
  //
  // The reseeded board is itself local data, though, and the next Google sign-in's
  // `cursor: null` (cursor cleared here too) means that board gets pushed as part of
  // a first sync — which the server treats as a genuine conflict (409) the moment the
  // signing-in account has *any* cloud data, same account or not. `markPendingFreshLogin()`
  // is what keeps that from ever reaching the user as a "keep local vs use account"
  // prompt: `syncEngine.ts#doSync` consumes it the one time it matters (an unprompted
  // first-sync conflict) and silently retries as `strategy: 'use_account'`, discarding
  // this placeholder board in favor of whatever the account actually has.
  //
  // Mirrors `AuthContext.tsx`'s own logout, which clears only its own Preferences keys
  // and has no `lib/db/*` dependency of its own — this is the DB-touching half of the
  // same transition, kept here for that reason.
  useEffect(() => {
    if (wasEligibleRef.current && !eligible) {
      Promise.all([
        withDb(async (db) => {
          await wipeSyncedData(db)
          await seedIfEmpty(db)
        }),
        clearSyncState(),
        markPendingFreshLogin(),
      ]).then(() => {
        setAppliedAt(Date.now())
      })
    }
    wasEligibleRef.current = eligible
  }, [eligible])

  // Becomes eligible (fresh Google sign-in, or app restart with a Google session
  // already hydrated) → sync immediately. Lives here, not inside AuthContext itself,
  // which stays a pure session/credentials concern with no dependency on lib/db/*.
  // Every state update below happens inside a nested async function, never as a bare
  // synchronous call in the effect body, so there's nothing to "derive during render
  // instead" here — this is a real external sync, not local state echoing a prop.
  useEffect(() => {
    if (!eligible || !accountId) return
    let cancelled = false

    async function start() {
      const persisted = await loadSyncState(accountId!)
      if (cancelled) return
      setLastSyncedAt(persisted?.lastSyncedAt ?? null)
      if (!cancelled) await trigger()
    }
    start()

    return () => {
      cancelled = true
    }
    // Re-run only when eligibility or the account itself changes, not on every
    // `trigger` identity change (it changes whenever `auth` does, e.g. on logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, accountId])

  useAppForeground(() => {
    if (eligible) trigger()
  })

  useEffect(() => {
    if (!eligible) return
    return onLocalChange(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => trigger(), EDIT_SYNC_DEBOUNCE_MS)
    })
  }, [eligible, trigger])

  useEffect(() => {
    if (!eligible) return
    function handleOnline() {
      trigger()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [eligible, trigger])

  // Fast poll only while another device is active right now (set from the previous
  // sync's response) and this one is in the foreground — never while backgrounded, and
  // never just because a second device exists somewhere but hasn't synced recently.
  useEffect(() => {
    if (!eligible || !otherDeviceActiveNow || !isForeground) return
    const interval = setInterval(() => trigger(), ACTIVE_DEVICE_POLL_MS)
    return () => clearInterval(interval)
  }, [eligible, otherDeviceActiveNow, isForeground, trigger])

  async function syncNow() {
    if (status === 'needs-strategy') {
      setStrategyPromptOpen(true)
      return
    }
    await trigger()
  }

  async function resolveStrategy(strategy: SyncStrategy) {
    await trigger(strategy)
  }

  function dismissStrategyPrompt() {
    setStrategyPromptOpen(false)
  }

  return (
    <SyncContext.Provider
      value={{
        status,
        lastSyncedAt,
        failure,
        appliedAt,
        strategyPromptOpen,
        syncNow,
        resolveStrategy,
        dismissStrategyPrompt,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
