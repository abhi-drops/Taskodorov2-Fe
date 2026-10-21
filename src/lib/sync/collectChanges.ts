import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { collectDirtyWorkspaces } from '../db/workspaces'
import { collectDirtyGroups } from '../db/groups'
import { collectDirtyNotes } from '../db/notes'
import { collectDirtyTemplates } from '../db/templates'
import { collectDirtyActivityEvents, collectDeletedActivityEventIds } from '../db/eventLog'
import { PUSH_CHUNK_SIZE } from '../../types/sync'
import type { SyncChanges } from '../../types/sync'

function emptyChanges(): SyncChanges {
  return {
    workspaces: [],
    groups: [],
    notes: [],
    templates: [],
    activityEvents: { upserts: [], deletes: [] },
  }
}

export interface PushReceipt {
  workspaces: { id: string; updatedAt: number }[]
  groups: { id: string; updatedAt: number }[]
  notes: { id: string; updatedAt: number }[]
  templates: { id: string; updatedAt: number }[]
  activityEvents: { id: string; createdAt: number }[]
  activityEventDeletes: string[]
}

export interface PushBatch {
  changes: SyncChanges
  receipt: PushReceipt
}

function emptyReceipt(): PushReceipt {
  return { workspaces: [], groups: [], notes: [], templates: [], activityEvents: [], activityEventDeletes: [] }
}

/**
 * One request's worth of local changes, phased **by entity type** rather than mixed —
 * workspaces, then groups, then notes, then templates, then activity-event upserts,
 * then activity-event deletes. Returns `null` once nothing is dirty.
 *
 * Phasing matters, not just chunking: the backend's ownership rule requires a
 * `workspaceId` to already belong to the account or be new *in the same request*
 * (docs/phase3-sync-plan-from-be.md §5). A chunk that mixed entity types could split a
 * brand-new workspace from the notes referencing it across two requests and get a
 * whole-request 400. Chunking itself is a real requirement too, not just defensive: a
 * few hundred notes already produce several thousand `activity_events` rows (genesis
 * fields plus startup backfill), well past the server's 2000-row cap per array.
 */
export async function collectNextBatch(db: SQLiteDBConnection): Promise<PushBatch | null> {
  const workspaces = await collectDirtyWorkspaces(db, PUSH_CHUNK_SIZE)
  if (workspaces.length > 0) {
    const changes = emptyChanges()
    changes.workspaces = workspaces
    const receipt = emptyReceipt()
    receipt.workspaces = workspaces.map((w) => ({ id: w.id, updatedAt: w.updatedAt }))
    return { changes, receipt }
  }

  const groups = await collectDirtyGroups(db, PUSH_CHUNK_SIZE)
  if (groups.length > 0) {
    const changes = emptyChanges()
    changes.groups = groups
    const receipt = emptyReceipt()
    receipt.groups = groups.map((g) => ({ id: g.id, updatedAt: g.updatedAt }))
    return { changes, receipt }
  }

  const notes = await collectDirtyNotes(db, PUSH_CHUNK_SIZE)
  if (notes.length > 0) {
    const changes = emptyChanges()
    changes.notes = notes
    const receipt = emptyReceipt()
    receipt.notes = notes.map((n) => ({ id: n.id, updatedAt: n.updatedAt }))
    return { changes, receipt }
  }

  const templates = await collectDirtyTemplates(db, PUSH_CHUNK_SIZE)
  if (templates.length > 0) {
    const changes = emptyChanges()
    changes.templates = templates
    const receipt = emptyReceipt()
    receipt.templates = templates.map((t) => ({ id: t.id, updatedAt: t.updatedAt }))
    return { changes, receipt }
  }

  const eventUpserts = await collectDirtyActivityEvents(db, PUSH_CHUNK_SIZE)
  if (eventUpserts.length > 0) {
    const changes = emptyChanges()
    changes.activityEvents.upserts = eventUpserts
    const receipt = emptyReceipt()
    receipt.activityEvents = eventUpserts.map((e) => ({ id: e.id, createdAt: e.createdAt }))
    return { changes, receipt }
  }

  const eventDeletes = await collectDeletedActivityEventIds(db, PUSH_CHUNK_SIZE)
  if (eventDeletes.length > 0) {
    const changes = emptyChanges()
    changes.activityEvents.deletes = eventDeletes
    const receipt = emptyReceipt()
    receipt.activityEventDeletes = eventDeletes
    return { changes, receipt }
  }

  return null
}

export function emptySyncChanges(): SyncChanges {
  return emptyChanges()
}

/**
 * Called once, only when this device's cursor is `null` (its very first sync): marks
 * every row dirty so the first push's "everything" naturally flows through the same
 * chunked, dirty-based `collectNextBatch` loop as every later sync. Scoped to
 * non-builtin templates — built-ins never sync (docs/phase3-sync-plan-from-be.md §6).
 */
export async function markEverythingDirty(db: SQLiteDBConnection): Promise<void> {
  await db.run('UPDATE workspaces SET dirty = 1')
  await db.run('UPDATE groups SET dirty = 1')
  await db.run('UPDATE notes SET dirty = 1')
  await db.run('UPDATE templates SET dirty = 1 WHERE builtin_id IS NULL')
  await db.run('UPDATE activity_events SET dirty = 1')
}
