import { SWATCH_OPTIONS, type SwatchColor } from '../../components/ui/swatchColors'
import type { NoteColorMode, SortedBy } from '../../types/group'
import type { NoteType, Priority } from '../../types/note'
import type { TemplateContent, TemplateGroup, TemplateNote } from '../../types/template'

/**
 * The exported template file: one JSON document. `app` and `kind` are how an import
 * recognises it; `version` is there so a later format change can still read old files.
 */
const FILE_APP = 'taskodoro'
const FILE_KIND = 'workspace-template'
const FILE_VERSION = 1

// An imported file is untrusted input, so sizes are capped as well as types checked.
const MAX_GROUPS = 50
const MAX_NOTES_PER_GROUP = 200
const MAX_LIST_ITEMS = 200
const MAX_TEXT = 2000

const SORTED_BY: SortedBy[] = ['manual', 'alphabetical', 'date', 'priority']
const COLOR_MODES: NoteColorMode[] = ['manual', 'priority']
const NOTE_TYPES: NoteType[] = ['basic', 'counter', 'list']
const PRIORITIES: Priority[] = ['low', 'normal', 'medium', 'high']

export function serializeTemplate(name: string, content: TemplateContent): string {
  return JSON.stringify({ app: FILE_APP, kind: FILE_KIND, version: FILE_VERSION, name, content }, null, 2)
}

/** "Weekly planner" -> "weekly-planner.taskodoro.json" */
export function templateFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'template'}.taskodoro.json`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, MAX_TEXT) : fallback
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function parseNote(raw: unknown, key: string): TemplateNote | null {
  if (!isRecord(raw)) return null
  const title = text(raw.title).trim()
  if (!title) return null
  const step = typeof raw.counterStep === 'number' && Number.isFinite(raw.counterStep) && raw.counterStep > 0 ? raw.counterStep : 1
  const target = typeof raw.counterTarget === 'number' && Number.isFinite(raw.counterTarget) ? raw.counterTarget : null
  const items = Array.isArray(raw.listItems) ? raw.listItems : []
  return {
    key,
    type: oneOf(raw.type, NOTE_TYPES, 'basic'),
    title,
    description: typeof raw.description === 'string' ? text(raw.description) : null,
    color: SWATCH_OPTIONS.includes(raw.color as SwatchColor) ? (raw.color as SwatchColor) : null,
    priority: oneOf(raw.priority, PRIORITIES, 'normal'),
    counterStep: step,
    counterTarget: target,
    listItems: items
      .filter((item): item is string => typeof item === 'string')
      .slice(0, MAX_LIST_ITEMS)
      .map((item) => text(item)),
  }
}

/**
 * Reads an exported template file. Returns `null` when the text isn't a Taskodoro
 * template at all; otherwise it is tolerant, field by field: unknown enum values fall
 * back to their defaults, malformed notes are skipped, and links to groups that aren't
 * in the file are dropped. Every group and note gets a fresh key, so nothing in the
 * file can collide or point outside it.
 */
export function parseTemplateFile(json: string): { name: string; content: TemplateContent } | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (!isRecord(raw) || raw.app !== FILE_APP || raw.kind !== FILE_KIND) return null
  if (!isRecord(raw.content) || !Array.isArray(raw.content.groups)) return null

  const rawGroups = raw.content.groups.filter(isRecord).slice(0, MAX_GROUPS)

  // Old key -> new key, for the two kinds of link between groups.
  const keys = new Map<string, string>()
  rawGroups.forEach((group, i) => {
    if (typeof group.key === 'string' && !keys.has(group.key)) keys.set(group.key, `g${i + 1}`)
  })
  const link = (value: unknown) => (typeof value === 'string' ? (keys.get(value) ?? null) : null)

  let noteCount = 0
  const groups: TemplateGroup[] = rawGroups.map((group, i) => {
    const key = `g${i + 1}`
    const notes = (Array.isArray(group.notes) ? group.notes : [])
      .slice(0, MAX_NOTES_PER_GROUP)
      .map((note) => parseNote(note, `n${++noteCount}`))
      .filter((note): note is TemplateNote => note !== null)
    const moveTo = link(group.onCheckMoveToKey)
    return {
      key,
      name: text(group.name).trim() || `Group ${i + 1}`,
      sortedBy: oneOf(group.sortedBy, SORTED_BY, 'manual'),
      noteColorMode: oneOf(group.noteColorMode, COLOR_MODES, 'manual'),
      onCheckMoveToKey: moveTo === key ? null : moveTo,
      resetOnMove: group.resetOnMove !== false,
      notes,
    }
  })

  return {
    name: text(raw.name).trim() || 'Imported template',
    content: { groups, completedGroupKey: link(raw.content.completedGroupKey) },
  }
}
