import type { TemplateContent, TemplateGroup, TemplateNote } from '../../types/template'

/**
 * Pure edits on a template's content, used by the template editor. Each returns a new
 * `TemplateContent` and never mutates its input, so they can be passed straight to a
 * React state setter.
 */

function usedKeys(content: TemplateContent): Set<string> {
  const keys = new Set<string>()
  for (const group of content.groups) {
    keys.add(group.key)
    for (const note of group.notes) keys.add(note.key)
  }
  return keys
}

/** A key no group or note in this template uses yet. */
export function newKey(content: TemplateContent): string {
  const taken = usedKeys(content)
  let key = crypto.randomUUID().slice(0, 8)
  while (taken.has(key)) key = crypto.randomUUID().slice(0, 8)
  return key
}

export function blankNote(key: string): TemplateNote {
  return {
    key,
    type: 'basic',
    title: '',
    description: null,
    color: 'yellow',
    priority: 'normal',
    counterStep: 1,
    counterTarget: null,
    listItems: [],
  }
}

function mapGroup(content: TemplateContent, key: string, fn: (group: TemplateGroup) => TemplateGroup): TemplateContent {
  return { ...content, groups: content.groups.map((group) => (group.key === key ? fn(group) : group)) }
}

export function addGroup(content: TemplateContent, name: string): TemplateContent {
  const group: TemplateGroup = {
    key: newKey(content),
    name,
    sortedBy: 'manual',
    noteColorMode: 'manual',
    onCheckMoveToKey: null,
    resetOnMove: true,
    hideAfterMode: 'never',
    hideAfterAmount: 1,
    hideAfterUnit: 'days',
    notes: [],
  }
  return { ...content, groups: [...content.groups, group] }
}

export function patchGroup(
  content: TemplateContent,
  key: string,
  patch: Partial<Omit<TemplateGroup, 'key' | 'notes'>>,
): TemplateContent {
  return mapGroup(content, key, (group) => ({ ...group, ...patch }))
}

/** Moves a group one place left (`-1`) or right (`1`); a no-op at either end. */
export function moveGroup(content: TemplateContent, key: string, direction: -1 | 1): TemplateContent {
  const from = content.groups.findIndex((group) => group.key === key)
  const to = from + direction
  if (from < 0 || to < 0 || to >= content.groups.length) return content
  const groups = [...content.groups]
  ;[groups[from], groups[to]] = [groups[to], groups[from]]
  return { ...content, groups }
}

/** Deletes a group and its sample notes, and clears every setting that pointed at it. */
export function deleteGroup(content: TemplateContent, key: string): TemplateContent {
  return {
    groups: content.groups
      .filter((group) => group.key !== key)
      .map((group) => (group.onCheckMoveToKey === key ? { ...group, onCheckMoveToKey: null } : group)),
    completedGroupKey: content.completedGroupKey === key ? null : content.completedGroupKey,
  }
}

export function setCompletedGroup(content: TemplateContent, key: string | null): TemplateContent {
  return { ...content, completedGroupKey: key }
}

export function addNote(content: TemplateContent, groupKey: string, note: TemplateNote): TemplateContent {
  return mapGroup(content, groupKey, (group) => ({ ...group, notes: [...group.notes, note] }))
}

export function patchNote(
  content: TemplateContent,
  noteKey: string,
  patch: Partial<Omit<TemplateNote, 'key'>>,
): TemplateContent {
  return {
    ...content,
    groups: content.groups.map((group) => ({
      ...group,
      notes: group.notes.map((note) => (note.key === noteKey ? { ...note, ...patch } : note)),
    })),
  }
}

export function deleteNote(content: TemplateContent, noteKey: string): TemplateContent {
  return {
    ...content,
    groups: content.groups.map((group) => ({ ...group, notes: group.notes.filter((note) => note.key !== noteKey) })),
  }
}

export function findNote(
  content: TemplateContent,
  noteKey: string,
): { note: TemplateNote; group: TemplateGroup } | null {
  for (const group of content.groups) {
    const note = group.notes.find((n) => n.key === noteKey)
    if (note) return { note, group }
  }
  return null
}

export function countNotes(content: TemplateContent): number {
  return content.groups.reduce((total, group) => total + group.notes.length, 0)
}
