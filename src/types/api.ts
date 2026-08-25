export interface ApiErrorBody {
  message: string
  code?: string
}

export class ApiError extends Error {
  status?: number
  code?: string
}
