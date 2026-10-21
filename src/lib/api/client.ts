import { ApiError } from '../../types/api'
import type { ApiErrorBody } from '../../types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!res.ok) {
    const body: Partial<ApiErrorBody> = await res.json().catch(() => ({}))
    const err = new ApiError(body.message ?? `Request failed (${res.status})`)
    err.status = res.status
    err.code = body.code
    err.body = body
    throw err
  }

  return res.json() as Promise<T>
}

export const api = {
  post: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, token),
}
