import { createContext } from 'react'
import type { SyncFailure } from './syncErrors'
import type { SyncStrategy } from '../../types/sync'

export type SyncStatus =
  | 'disabled' // not signed in via Google — sync is gated on that specifically
  | 'idle'
  | 'syncing'
  | 'offline'
  | 'needs-strategy' // the 409 first-sync conflict
  | 'error'

export interface SyncContextState {
  status: SyncStatus
  lastSyncedAt: number | null
  failure: SyncFailure | null
  /** Bumped after any pull that actually wrote something — a refresh signal for data
   *  consumers like `WorkspaceContext`/`useBoard` (neither has one of its own). */
  appliedAt: number
  /** Whether the first-sync strategy dialog should currently be shown. Separate from
   *  `status === 'needs-strategy'` so dismissing it doesn't lose that status — the
   *  Settings chip can still reopen it. */
  strategyPromptOpen: boolean
}

export interface SyncContextValue extends SyncContextState {
  syncNow(): Promise<void>
  resolveStrategy(strategy: SyncStrategy): Promise<void>
  dismissStrategyPrompt(): void
}

export const SyncContext = createContext<SyncContextValue | undefined>(undefined)
