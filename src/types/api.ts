export interface ApiErrorBody {
  message: string
  code?: string
}

export class ApiError extends Error {
  status?: number
  code?: string
  /** The parsed error response body, when there was one. Needed for endpoint-specific
   *  flags like /sync's `needsSyncStrategy` (docs/phase3-sync-plan-from-be.md §4) that
   *  don't fit `message`/`code`. */
  body?: unknown
}
