import type { NoteStatus } from '../../types/note'

export function sortStatusesNewestFirst(statuses: NoteStatus[]): NoteStatus[] {
  return [...statuses].sort((a, b) => b.createdAt - a.createdAt)
}

export function getLatestStatus(statuses: NoteStatus[]): NoteStatus | null {
  return sortStatusesNewestFirst(statuses)[0] ?? null
}

export function formatStatusTimestamp(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(createdAt),
  )
}
