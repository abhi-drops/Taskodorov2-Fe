import type { SwatchColor } from '../../components/ui/swatchColors'
import { SWATCH_OPTIONS } from '../../components/ui/swatchColors'
import type { Group } from '../../types/group'
import type { CounterPayload, ListPayload, Note } from '../../types/note'
import type { TemplateContent, TemplateNote } from '../../types/template'

function toTemplateNote(note: Note, key: string): TemplateNote {
  const counter = note.type === 'counter' ? (note.payload as CounterPayload) : null
  const list = note.type === 'list' ? (note.payload as ListPayload) : null
  return {
    key,
    type: note.type,
    title: note.title,
    description: note.description,
    color: SWATCH_OPTIONS.includes(note.color as SwatchColor) ? (note.color as SwatchColor) : null,
    priority: note.priority,
    counterStep: counter?.step ?? 1,
    counterTarget: counter?.target ?? null,
    listItems: list ? [...list.items].sort((a, b) => a.position - b.position).map((item) => item.text) : [],
  }
}

/**
 * Captures a workspace's structure as template content: every group with its settings,
 * the Completed group, and only the notes passed in (the ones the user ticked) as
 * sample notes. State is dropped on purpose: checked flags, counter values, statuses
 * and all database ids stay behind.
 *
 * `groups` and `notes` are expected in board order (as `listGroups` and
 * `listNotesByWorkspace` return them).
 */
export function workspaceToTemplateContent(
  groups: Group[],
  notes: Note[],
  completedGroupId: string | null,
): TemplateContent {
  const keys = new Map(groups.map((group, i) => [group.id, `g${i + 1}`]))
  let noteCount = 0

  return {
    groups: groups.map((group) => ({
      key: keys.get(group.id)!,
      name: group.name,
      sortedBy: group.sortedBy,
      noteColorMode: group.noteColorMode,
      onCheckMoveToKey: group.onCheckMoveToGroupId ? (keys.get(group.onCheckMoveToGroupId) ?? null) : null,
      resetOnMove: group.resetOnMove,
      notes: notes.filter((note) => note.groupId === group.id).map((note) => toTemplateNote(note, `n${++noteCount}`)),
    })),
    completedGroupKey: completedGroupId ? (keys.get(completedGroupId) ?? null) : null,
  }
}
