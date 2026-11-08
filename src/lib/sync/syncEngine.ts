import { withDb } from '../db/sqlite'
import { clearWorkspaceDirty } from '../db/workspaces'
import { clearGroupDirty } from '../db/groups'
import { clearNoteDirty } from '../db/notes'
import { clearTemplateDirty } from '../db/templates'
import { clearActivityEventDirty, clearPushedEventDeletions } from '../db/eventLog'
import { clearUserStateDirty } from '../db/userState'
import { wipeSyncedData } from '../db/reset'
import { collectNextBatch, emptySyncChanges, markEverythingDirty } from './collectChanges'
import { applyPulledChanges } from './applyChanges'
import { classifySyncError } from './syncErrors'
import { syncApi, SyncStrategyRequiredError } from '../api/sync'
import {
  saveSyncState,
  loadSyncState,
  getOrCreateDeviceId,
  consumePendingFreshLogin,
} from '../storage/preferences'
import type { PushBatch } from './collectChanges'
import type { SyncFailure } from './syncErrors'
import type { SyncResponse, SyncStrategy } from '../../types/sync'

/**
 * How long to wait after a local edit before pushing. Longer than the note editor's
 * own 600ms autosave debounce, so a burst of saves while typing a title becomes one
 * push; still short enough to feel immediate moving between devices.
 */
export const EDIT_SYNC_DEBOUNCE_MS = 5_000

export interface SyncDeps {
  token: string
  /** Scopes the locally-stored cursor — see `preferences.ts`'s `SyncState`. */
  accountId: string
  /** Only meaningful on a retry after a `needs-strategy` result. */
  strategy?: SyncStrategy
}

export type SyncResult =
  | { outcome: 'synced'; applied: boolean; cursor: number; otherDeviceActiveNow: boolean }
  | { outcome: 'needs-strategy' }
  | { outcome: 'failed'; failure: SyncFailure }

async function clearReceipt(batch: PushBatch): Promise<void> {
  await withDb(async (db) => {
    await clearWorkspaceDirty(db, batch.receipt.workspaces)
    await clearGroupDirty(db, batch.receipt.groups)
    await clearNoteDirty(db, batch.receipt.notes)
    await clearTemplateDirty(db, batch.receipt.templates)
    await clearActivityEventDirty(db, batch.receipt.activityEvents)
    await clearPushedEventDeletions(db, batch.receipt.activityEventDeletes)
    await clearUserStateDirty(db, batch.receipt.userState)
  })
}

async function doSync(deps: SyncDeps): Promise<SyncResult> {
  const stored = await loadSyncState(deps.accountId)
  let cursor = stored?.cursor ?? null
  const isFirstSync = cursor === null

  if (isFirstSync) {
    await withDb((db) => markEverythingDirty(db))
  }

  let strategy = deps.strategy
  let applied = false
  let sentOnePull = false
  let otherDeviceActiveNow = false
  const deviceId = await getOrCreateDeviceId()

  while (true) {
    const batch = await withDb((db) => collectNextBatch(db))
    if (batch === null && sentOnePull) break

    const changes = batch ? batch.changes : emptySyncChanges()
    let response: SyncResponse
    try {
      response = await syncApi.sync({ cursor, strategy, deviceId, changes }, deps.token)
    } catch (err) {
      if (!(err instanceof SyncStrategyRequiredError)) return { outcome: 'failed', failure: classifySyncError(err) }

      // A conflict on an *unprompted* first sync (no strategy picked yet) is expected,
      // not exceptional, right after a logout-triggered wipe — that device's next
      // sign-in is always a cursor:null request against whatever the account already
      // has, which the server treats as a genuine conflict regardless of how empty the
      // push is. `markPendingFreshLogin()` (`SyncContext.tsx`'s wipe-on-logout) is what
      // sets this; consuming it here means that specific case never shows the
      // keep-local/use-account dialog — it already knows the answer is "use the
      // account's data." Any other conflict (the marker isn't set) still surfaces
      // `needs-strategy` exactly as before.
      if (strategy || !(await consumePendingFreshLogin())) return { outcome: 'needs-strategy' }

      strategy = 'use_account'
      try {
        response = await syncApi.sync({ cursor, strategy, deviceId, changes }, deps.token)
      } catch (retryErr) {
        return { outcome: 'failed', failure: classifySyncError(retryErr) }
      }
    }
    const pulled = response
    otherDeviceActiveNow = pulled.deviceActivity?.otherDeviceActiveNow ?? false

    await withDb(async (db) => {
      // Only the request that actually carried `strategy: 'use_account'` triggers the
      // wipe, and that can only be the first iteration (every later chunk sends no
      // strategy) — so this never fires more than once per sync.
      if (strategy === 'use_account') await wipeSyncedData(db)
      applied = (await applyPulledChanges(db, pulled.changes)) || applied
    })
    if (batch) await clearReceipt(batch)

    cursor = pulled.cursor
    await saveSyncState({ accountId: deps.accountId, cursor, lastSyncedAt: Date.now() })

    strategy = undefined // only the very first request of a sync carries it
    sentOnePull = true
    if (batch === null) break
  }

  return { outcome: 'synced', applied, cursor: cursor!, otherDeviceActiveNow }
}

// Concurrent calls (React StrictMode's double-invoked effects, two triggers firing
// close together) share one in-flight run instead of racing two pushes.
let inFlight: Promise<SyncResult> | null = null

export function runSync(deps: SyncDeps): Promise<SyncResult> {
  if (inFlight) return inFlight
  inFlight = doSync(deps).finally(() => {
    inFlight = null
  })
  return inFlight
}
