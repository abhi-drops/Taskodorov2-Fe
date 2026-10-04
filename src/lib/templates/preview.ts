import type { Group } from '../../types/group'
import type { Note, NotePayload } from '../../types/note'
import type { TemplateGroup, TemplateNote } from '../../types/template'

/**
 * Turns a template's group and sample notes into the `Group`/`Note` shapes the real note
 * cards take, so the template editor can show them exactly as they will look on a
 * board. Ids are the template keys; nothing here is ever written to the database (the
 * cards are rendered `readOnly`).
 */

function previewPayload(note: TemplateNote): NotePayload {
  if (note.type === 'counter') return { value: 0, step: note.counterStep, target: note.counterTarget }
  if (note.type === 'list') {
    return {
      items: note.listItems.map((text, position) => ({ id: `${note.key}-${position}`, text, completed: false, position })),
    }
  }
  return {}
}

export function previewGroup(group: TemplateGroup, position: number): Group {
  return {
    id: group.key,
    workspaceId: '',
    name: group.name,
    position,
    sortedBy: group.sortedBy,
    noteColorMode: group.noteColorMode,
    onCheckMoveToGroupId: group.onCheckMoveToKey,
    resetOnMove: group.resetOnMove,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  }
}

export function previewNote(note: TemplateNote, groupKey: string, position: number): Note {
  return {
    id: note.key,
    workspaceId: '',
    groupId: groupKey,
    type: note.type,
    // An untitled sample note is still being written in the note dialog.
    title: note.title || 'Untitled',
    description: note.description,
    color: note.color,
    priority: note.priority,
    position,
    completed: false,
    payload: previewPayload(note),
    statuses: [],
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  }
}
