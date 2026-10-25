import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { withDb } from './sqlite'
import { BUILTIN_TEMPLATES } from '../templates/builtins'
import { factoryFingerprint } from '../templates/builtinFingerprint'
import { notifyLocalChange } from './localChange'
import type { Template, TemplateContent } from '../../types/template'

interface TemplateRow {
  id: string
  name: string
  builtin_id: string | null
  position: number
  content: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    builtinId: row.builtin_id,
    position: row.position,
    content: JSON.parse(row.content) as TemplateContent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

/** Built-ins first (they hold negative positions), then the user's own, oldest first. */
export function listTemplates(): Promise<Template[]> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM templates WHERE deleted_at IS NULL ORDER BY position ASC')
    return ((result.values ?? []) as TemplateRow[]).map(rowToTemplate)
  })
}

export function getTemplateById(id: string): Promise<Template | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM templates WHERE id = ? AND deleted_at IS NULL', [id])
    const row = (result.values ?? [])[0] as TemplateRow | undefined
    return row ? rowToTemplate(row) : null
  })
}

/** "Name", then "Name (2)", "Name (3)"... so two templates never share a name. */
async function uniqueName(db: SQLiteDBConnection, name: string): Promise<string> {
  const { values } = await db.query('SELECT name FROM templates WHERE deleted_at IS NULL')
  const taken = new Set(((values ?? []) as { name: string }[]).map((row) => row.name))
  if (!taken.has(name)) return name
  let n = 2
  while (taken.has(`${name} (${n})`)) n++
  return `${name} (${n})`
}

async function insertTemplate(db: SQLiteDBConnection, name: string, content: TemplateContent): Promise<Template> {
  // User templates count up from 0; built-ins sit below 0.
  const { values } = await db.query('SELECT MAX(position) as max FROM templates WHERE builtin_id IS NULL')
  const max = (values?.[0] as { max: number | null } | undefined)?.max
  const position = max == null ? 0 : max + 1

  const id = crypto.randomUUID()
  const now = Date.now()
  const finalName = await uniqueName(db, name)
  await db.run(
    'INSERT INTO templates (id, name, builtin_id, position, content, created_at, updated_at, deleted_at, dirty) VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, 1)',
    [id, finalName, position, JSON.stringify(content), now, now],
  )
  notifyLocalChange()
  return { id, name: finalName, builtinId: null, position, content, createdAt: now, updatedAt: now, deletedAt: null }
}

/** Always creates a user template (never a built-in), renaming on a name clash. */
export function createTemplate(input: { name: string; content: TemplateContent }): Promise<Template> {
  return withDb((db) => insertTemplate(db, input.name, input.content))
}

export function duplicateTemplate(id: string): Promise<Template | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM templates WHERE id = ? AND deleted_at IS NULL', [id])
    const row = (result.values ?? [])[0] as TemplateRow | undefined
    if (!row) return null
    return insertTemplate(db, row.name, JSON.parse(row.content) as TemplateContent)
  })
}

export function updateTemplate(id: string, patch: { name?: string; content?: TemplateContent }): Promise<void> {
  return withDb(async (db) => {
    const sets: string[] = []
    const params: (string | number)[] = []
    if (patch.name !== undefined) {
      sets.push('name = ?')
      params.push(patch.name)
    }
    if (patch.content !== undefined) {
      sets.push('content = ?')
      params.push(JSON.stringify(patch.content))
    }
    if (sets.length === 0) return
    sets.push('updated_at = ?', 'dirty = 1')
    params.push(Date.now(), id)
    await db.run(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`, params)
    notifyLocalChange()
  })
}

/** Built-in templates can't be deleted (only reset), so this leaves them alone. */
export function deleteTemplate(id: string): Promise<void> {
  return withDb(async (db) => {
    const now = Date.now()
    await db.run(
      'UPDATE templates SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ? AND builtin_id IS NULL',
      [now, now, id],
    )
    notifyLocalChange()
  })
}

/**
 * Puts a built-in template's name and content back to what the app ships with. Also
 * re-records the factory baseline (`builtinFingerprint.ts`), so a built-in the user had
 * edited starts tracking later releases' versions again from here on.
 */
export function resetBuiltinTemplate(id: string): Promise<Template | null> {
  return withDb(async (db) => {
    const result = await db.query('SELECT * FROM templates WHERE id = ? AND deleted_at IS NULL', [id])
    const row = (result.values ?? [])[0] as TemplateRow | undefined
    const builtin = BUILTIN_TEMPLATES.find((b) => b.builtinId === row?.builtin_id)
    if (!row || !builtin) return null
    const now = Date.now()
    const content = JSON.stringify(builtin.content)
    await db.run('UPDATE templates SET name = ?, content = ?, builtin_fingerprint = ?, updated_at = ? WHERE id = ?', [
      builtin.name,
      content,
      factoryFingerprint(builtin),
      now,
      id,
    ])
    return rowToTemplate({ ...row, name: builtin.name, content, updated_at: now })
  })
}

// --- Sync (Phase 3): built-ins never sync, so every query/write here is scoped to
// `builtin_id IS NULL` at the SQL level, not with a later .filter() a call site could
// forget. ---

export async function collectDirtyTemplates(db: SQLiteDBConnection, limit: number): Promise<Template[]> {
  const result = await db.query(
    'SELECT * FROM templates WHERE dirty = 1 AND builtin_id IS NULL ORDER BY updated_at ASC LIMIT ?',
    [limit],
  )
  return ((result.values ?? []) as TemplateRow[]).map(rowToTemplate)
}

/**
 * Mirror of `rowToTemplate`: writes a server-origin row by its own id, always as a user
 * template (`builtin_id = NULL`, defence-in-depth — the server never sends built-ins).
 * Deliberately never calls `uniqueName()`: a pulled template can collide in name with a
 * local one, and renaming it locally would mark it dirty and push a divergent name back,
 * ping-ponging forever. A duplicate name is an accepted, harmless outcome.
 */
export async function upsertTemplateFromServer(db: SQLiteDBConnection, row: Template): Promise<void> {
  await db.run(
    `INSERT INTO templates (id, name, builtin_id, position, content, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       position = excluded.position,
       content = excluded.content,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       dirty = 0`,
    [row.id, row.name, row.position, JSON.stringify(row.content), row.createdAt, row.updatedAt, row.deletedAt],
  )
}

export async function clearTemplateDirty(
  db: SQLiteDBConnection,
  pushed: { id: string; updatedAt: number }[],
): Promise<void> {
  for (const { id, updatedAt } of pushed) {
    await db.run('UPDATE templates SET dirty = 0 WHERE id = ? AND updated_at = ?', [id, updatedAt])
  }
}
