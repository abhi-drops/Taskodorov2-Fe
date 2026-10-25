import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { BUILTIN_TEMPLATES } from './builtins'
import { factoryFingerprint, rowFingerprint } from './builtinFingerprint'

// A template's groups, settings and sample notes are one JSON document (`content`), like
// `notes.payload`: they are only ever read and written as a whole.
//
// `builtin_fingerprint` (built-in rows only) is the factory version the row reflects —
// see `builtinFingerprint.ts` for why it exists and `seedBuiltinTemplates` below for
// how it is used.
export const TEMPLATES_SQL = `
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  builtin_id TEXT,
  position INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  builtin_fingerprint TEXT
);
`

interface BuiltinRow {
  id: string
  builtin_id: string
  name: string
  position: number
  content: string
  builtin_fingerprint: string | null
}

/** Built-ins take positions below 0 so they always list before the user's own. */
function builtinPosition(index: number): number {
  return index - BUILTIN_TEMPLATES.length
}

/**
 * Puts the built-in templates in step with what this build of the app ships. Runs on
 * every launch, so a later release's changes reach installs that have already seeded:
 *
 * - a built-in the table doesn't have yet is inserted (a newly shipped one reaches
 *   existing installs);
 * - a built-in the user has **not** edited is replaced when the factory version has
 *   changed — the fix for factory edits otherwise never arriving, since each row is the
 *   user's own data (`builtinFingerprint.ts`);
 * - a built-in the user **has** edited is left alone, now and in every later release.
 *   Their own version only goes back to factory when they ask for it, through the
 *   editor's "Reset to Default".
 */
export async function seedBuiltinTemplates(db: SQLiteDBConnection): Promise<void> {
  const existing = await db.query(
    'SELECT id, builtin_id, name, position, content, builtin_fingerprint FROM templates WHERE builtin_id IS NOT NULL',
  )
  const rows = new Map(((existing.values ?? []) as BuiltinRow[]).map((row) => [row.builtin_id, row]))

  const now = Date.now()
  for (let i = 0; i < BUILTIN_TEMPLATES.length; i++) {
    const builtin = BUILTIN_TEMPLATES[i]
    const position = builtinPosition(i)
    const factory = factoryFingerprint(builtin)
    const row = rows.get(builtin.builtinId)

    if (!row) {
      await db.run(
        `INSERT INTO templates (id, name, builtin_id, position, content, created_at, updated_at, deleted_at, builtin_fingerprint)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [crypto.randomUUID(), builtin.name, builtin.builtinId, position, JSON.stringify(builtin.content), now, now, factory],
      )
      continue
    }

    // Order is the app's to decide, not the user's (nothing in the UI reorders
    // templates), so a reordered or newly inserted built-in re-sorts the list even for
    // rows whose content is left untouched below.
    if (row.position !== position) {
      await db.run('UPDATE templates SET position = ? WHERE id = ?', [position, row.id])
    }

    // Already the current factory version: nothing to do.
    if (row.builtin_fingerprint === factory) continue
    // No baseline (a built-in from before this column existed that may have been
    // edited — see `backfillBuiltinFingerprints`), or edited since it last matched the
    // factory: the user's copy stands.
    if (row.builtin_fingerprint === null) continue
    if (rowFingerprint(row.name, row.content) !== row.builtin_fingerprint) continue

    await db.run(
      'UPDATE templates SET name = ?, content = ?, builtin_fingerprint = ?, updated_at = ? WHERE id = ?',
      [builtin.name, JSON.stringify(builtin.content), factory, now, row.id],
    )
  }
}

/**
 * One-shot, run by `migrateSchema` the moment `builtin_fingerprint` is added to an
 * install that predates it. Those built-in rows were seeded from an older factory
 * version with nothing recorded about whether the user has edited them, so the only
 * signal left is `updated_at`: the seed wrote it equal to `created_at`, and every edit
 * (and every reset) moves it.
 *
 * A row still showing its seed timestamp is therefore untouched, and gets a baseline of
 * its current content — which enrolls it in the refresh above, where it differs from
 * this build's factory version and is replaced. Every other row keeps a NULL baseline
 * and is left alone for good, so this migration can't destroy an edit it can't see.
 */
export async function backfillBuiltinFingerprints(db: SQLiteDBConnection): Promise<void> {
  const untouched = await db.query(
    'SELECT id, name, content FROM templates WHERE builtin_id IS NOT NULL AND updated_at = created_at',
  )
  for (const row of (untouched.values ?? []) as { id: string; name: string; content: string }[]) {
    const baseline = rowFingerprint(row.name, row.content)
    if (!baseline) continue
    await db.run('UPDATE templates SET builtin_fingerprint = ? WHERE id = ?', [baseline, row.id])
  }
}
