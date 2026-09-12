import { useState } from 'react'
import {
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { useBoard } from './useBoard'
import type { Note } from '../types/note'
import type { Group } from '../types/group'

/**
 * Draggable/droppable id + data conventions shared by GroupColumn (web columns + the
 * active mobile column) and the mobile BoardTabStrip:
 * - `note:<id>`        draggable+sortable note card    — data: DragNoteData
 * - `group:<id>`       droppable note-drop landing zone for a group (column body /
 *                      active mobile column body) — data: DragGroupDropData
 * - `group-chip:<id>`  draggable+sortable column header chip / tab — data: DragGroupChipData
 */
export type DragNoteData = { type: 'note'; noteId: string; groupId: string }
export type DragGroupDropData = { type: 'group'; groupId: string }
export type DragGroupChipData = { type: 'group-chip'; groupId: string }
export type DragData = DragNoteData | DragGroupDropData | DragGroupChipData

export const noteDragId = (noteId: string) => `note:${noteId}`
export const groupDropId = (groupId: string) => `group:${groupId}`
export const groupChipDragId = (groupId: string) => `group-chip:${groupId}`

export type ActiveDragItem = { type: 'note'; note: Note } | { type: 'group-chip'; group: Group } | null

interface UseBoardDndOptions {
  /** Called with the destination group id right after a note is dropped into a *different* group. */
  onNoteMovedToGroup?: (groupId: string) => void
}

export function useBoardDnd(board: ReturnType<typeof useBoard>, options: UseBoardDndOptions = {}) {
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // A resting finger drifts more than a mouse does. Drag sources also set
    // `touch-action: manipulation` (see GroupColumn.tsx/BoardTabStrip.tsx) — not
    // `none`, which was tried first but breaks native vertical scrolling of the note
    // list, since nearly the whole list is drag-source cards. Because activation here
    // is delay-based (long-press), the sensor's own delay+tolerance already tells a
    // quick scroll swipe apart from a held press, so `none` was never actually needed
    // for reliable drag detection.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 16 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined
    if (data?.type === 'note') {
      const note = board.notes.find((n) => n.id === data.noteId)
      setActiveDragItem(note ? { type: 'note', note } : null)
    } else if (data?.type === 'group-chip') {
      const group = board.groups.find((g) => g.id === data.groupId)
      setActiveDragItem(group ? { type: 'group-chip', group } : null)
    } else {
      setActiveDragItem(null)
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as DragData | undefined
    if (!activeData) return

    if (activeData.type === 'note') {
      const overData = over.data.current as DragData | undefined
      if (overData?.type === 'note' && overData.noteId === activeData.noteId) return
      const destGroupId = overData?.type === 'note' || overData?.type === 'group' ? overData.groupId : null
      if (!destGroupId) return
      const destGroup = board.groups.find((g) => g.id === destGroupId)
      if (!destGroup) return

      const destNotes = board.notesForGroup(destGroup).filter((n) => n.id !== activeData.noteId)
      const destIndex =
        overData?.type === 'note' ? destNotes.findIndex((n) => n.id === overData.noteId) : destNotes.length
      board.moveNote(activeData.noteId, destGroupId, destIndex === -1 ? destNotes.length : destIndex)
      if (destGroupId !== activeData.groupId) options.onNoteMovedToGroup?.(destGroupId)
      return
    }

    if (activeData.type === 'group-chip') {
      const overData = over.data.current as DragData | undefined
      if (overData?.type !== 'group-chip') return
      const ids = board.groups.map((g) => g.id)
      const oldIndex = ids.indexOf(activeData.groupId)
      const newIndex = ids.indexOf(overData.groupId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      board.reorderGroups(arrayMove(ids, oldIndex, newIndex))
    }
  }

  return { sensors, activeDragItem, handleDragStart, handleDragEnd, handleDragCancel }
}
