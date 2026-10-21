import { api } from './client'
import { ApiError } from '../../types/api'
import type { SyncRequest, SyncResponse } from '../../types/sync'

/**
 * Thrown for the 409 in docs/phase3-sync-plan-from-be.md §4: this device has never
 * synced and the account already has data elsewhere, so the user has to pick a
 * strategy before anything is applied. Nothing was applied server-side on this
 * response — the uploaded `changes` were discarded, not partially applied.
 */
export class SyncStrategyRequiredError extends ApiError {}

export const syncApi = {
  async sync(payload: SyncRequest, token: string): Promise<SyncResponse> {
    try {
      return await api.post<SyncResponse>('/sync', payload, token)
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        (err.body as { needsSyncStrategy?: boolean } | undefined)?.needsSyncStrategy
      ) {
        const strategyError = new SyncStrategyRequiredError(err.message)
        strategyError.status = 409
        throw strategyError
      }
      throw err
    }
  },
}
