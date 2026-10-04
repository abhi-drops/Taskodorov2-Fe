import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { BUILTIN_TEMPLATES } from './builtins'

// A template's groups, settings and sample notes are one JSON document (`content`), like
// `notes.payload`: they are only ever read and written as a whole.
export const TEMPLATES_SQL = `
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  builtin_id TEXT,
  position INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
`

/**
 * Adds any built-in template the table doesn't have yet, matched by `builtin_id`. Runs
 * on every launch, so a built-in added in a later release reaches existing installs,
 * and never overwrites one the user has edited.
 */
export async function seedBuiltinTemplates(db: SQLiteDBConnection): Promise<void> {
  const existing = await db.query('SELECT builtin_id FROM templates WHERE builtin_id IS NOT NULL')
  const have = new Set(((existing.values ?? []) as { builtin_id: string }[]).map((row) => row.builtin_id))

  const now = Date.now()
  for (let i = 0; i < BUILTIN_TEMPLATES.length; i++) {
    const builtin = BUILTIN_TEMPLATES[i]
    if (have.has(builtin.builtinId)) continue
    // Built-ins take positions below 0 so they always list before the user's own.
    await db.run(
      'INSERT INTO templates (id, name, builtin_id, position, content, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
      [crypto.randomUUID(), builtin.name, builtin.builtinId, i - BUILTIN_TEMPLATES.length, JSON.stringify(builtin.content), now, now],
    )
  }
}
