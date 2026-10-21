import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { runSync, EDIT_SYNC_DEBOUNCE_MS } from './syncEngine'
import { onLocalChange } from '../db/localChange'
import { useAppForeground } from '../platform/useAppForeground'
import { loadSyncState } from '../storage/preferences'
import { SyncContext } from './syncContext'
import type { SyncStatus } from './syncContext'
import type { SyncFailure } from './syncErrors'
import type { SyncStrategy } from '../../types/sync'

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
