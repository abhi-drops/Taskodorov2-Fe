import type { Workspace } from './workspace'
import type { Group } from './group'
import type { Note } from './note'
import type { Template } from './template'

/**
 * Wire shapes for `POST /sync` (docs/phase3-sync-plan-from-be.md). Row shapes are
 * camelCase and 1:1 with the existing domain types — the backend maps them straight to
 * Postgres columns and does no business-logic validation, so there's no separate DTO
 * layer to keep in step; reusing the domain types *is* the contract.
 */

export type WorkspaceRow = Workspace
export type GroupRow = Group
export type NoteRow = Note
export type TemplateRow = Template

/**
 * Structurally identical to `lib/db/eventLog.ts`'s `ActivityEvent`. The field unions are
 * repeated here (rather than imported) so `types/` doesn't depend on `lib/`; keep the
 * two in step if a new action/field is ever added.
 */
export interface ActivityEventRow {
  id: string
  workspaceId: string
  entityType: 'note' | 'group'
  entityId: string
  action: 'created' | 'moved' | 'deleted' | 'field_changed'
  fromGroupId: string | null
  toGroupId: string | null
  field: 'title' | 'color' | 'completed' | 'counter' | 'list' | 'status' | null
  newValue: string | null
  createdAt: number
}

export type SyncStrategy = 'keep_local' | 'use_account'

export interface SyncChanges {
  workspaces: WorkspaceRow[]
  groups: GroupRow[]
  notes: NoteRow[]
  /** Never rows with `builtinId` set — the server neither stores nor returns those. */
  templates: TemplateRow[]
  activityEvents: {
    upserts: ActivityEventRow[]
    deletes: string[]
  }
}

export interface SyncRequest {
  /** `null` only on a device's very first sync. Opaque otherwise — never compared to a
   *  local clock or recomputed; store and resend whatever the server last returned. */
  cursor: number | null
  /** Only sent on a retry after a 409 (`docs/phase3-sync-plan-from-be.md` §4). */
  strategy?: SyncStrategy
  /** Per-install id from `getOrCreateDeviceId()` — drives `deviceActivity` below. */
  deviceId?: string
  changes: SyncChanges
}

/** Only present when the request carried `deviceId`. `otherDeviceActiveNow` is the
 *  signal that actually matters client-side: it's what gates the 10s poll in
 *  `SyncContext` — `otherDeviceCount` being non-zero just means a second device exists
 *  somewhere, not that it's worth polling fast right now. */
export interface SyncDeviceActivity {
  otherDeviceCount: number
  otherDeviceActiveNow: boolean
}

export interface SyncResponse {
  cursor: number
  changes: SyncChanges
  deviceActivity?: SyncDeviceActivity | null
}

/** Defensive limit mirrored from the backend's own per-array row cap. */
export const SYNC_ROW_CAP = 2000

/** Comfortably under `SYNC_ROW_CAP`, so a single table's push never needs to reason
 *  about the server's own limit directly. */
export const PUSH_CHUNK_SIZE = 500
