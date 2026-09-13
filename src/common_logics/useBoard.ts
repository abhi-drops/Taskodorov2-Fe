import { useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { listGroups, reorderGroups as reorderGroupsInDb } from '../lib/db/groups'
import { listNotesByWorkspace, reorderNotes } from '../lib/db/notes'
import type { Group } from '../types/group'
import type { Note } from '../types/note'

const PRIORITY_RANK: Record<Note['priority'], number> = { high: 0, medium: 1, normal: 2, low: 3 }

function sortNotes(notes: Note[], sortedBy: Group['sortedBy']): Note[] {
  const sorted = [...notes]
  if (sortedBy === 'alphabetical') {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortedBy === 'date') {
    sorted.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sortedBy === 'priority') {
    sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  } else {
    sorted.sort((a, b) => a.position - b.position)
  }
  return sorted
}

/**
 * Remembers the last active board tab across a `HomePage` unmount/remount (e.g.
 * navigating to the note editor and back) for the lifetime of this session — reset on
 * a full app restart/page reload, not persisted to disk. `useBoard` is only ever
 * instantiated by `HomePage`, so a module-level value is sufficient here without a
 * dedicated context.
 */
let lastActiveGroupId: string | null = null

export function useBoard() {
  const { activeWorkspaceId } = useWorkspace()
  const [groups, setGroups] = useState<Group[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => lastActiveGroupId)

  function setActiveGroupId(value: string | null | ((current: string | null) => string | null)) {
    setActiveGroupIdState((current) => {
      const next = typeof value === 'function' ? value(current) : value
      lastActiveGroupId = next
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) {
        setGroups([])
        setNotes([])
        setActiveGroupId(null)
        return
      }
      const [activeGroups, activeNotes] = await Promise.all([
        listGroups(activeWorkspaceId),
        listNotesByWorkspace(activeWorkspaceId),
      ])
      if (cancelled) return
      setGroups(activeGroups)
      setNotes(activeNotes)
      setActiveGroupId((current) =>
        current && activeGroups.some((g) => g.id === current) ? current : (activeGroups[0]?.id ?? null),
      )
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  function notesForGroup(group: Group): Note[] {
    return sortNotes(
      notes.filter((n) => n.groupId === group.id),
      group.sortedBy,
    )
  }

  async function refresh() {
    if (!activeWorkspaceId) return
    setNotes(await listNotesByWorkspace(activeWorkspaceId))
  }

  /**
   * Drag-and-drop move: relocates `noteId` into `toGroupId`, at `destIndex` when the
   * destination is sorted 'manual' (destIndex is ignored otherwise — the note is just
   * appended and the group's own sort rule places it visually, per feat-groups.md).
   * Also used for a same-group manual reorder (toGroupId === the note's current group).
   */
  async function moveNote(noteId: string, toGroupId: string, destIndex: number) {
    const note = notes.find((n) => n.id === noteId)
    const destGroup = groups.find((g) => g.id === toGroupId)
    if (!note || !destGroup) return
    const fromGroupId = note.groupId

    const destSiblings = notes
      .filter((n) => n.groupId === toGroupId && n.id !== noteId)
      .sort((a, b) => a.position - b.position)

    const updates: { id: string; groupId: string; position: number }[] = []

    if (destGroup.sortedBy === 'manual') {
      const ordered = [...destSiblings]
      ordered.splice(Math.max(0, Math.min(destIndex, ordered.length)), 0, note)
      ordered.forEach((n, i) => updates.push({ id: n.id, groupId: toGroupId, position: i }))
    } else {
      updates.push({ id: noteId, groupId: toGroupId, position: destSiblings.length })
    }

    if (fromGroupId !== toGroupId) {
      const sourceGroup = groups.find((g) => g.id === fromGroupId)
      if (sourceGroup?.sortedBy === 'manual') {
        notes
          .filter((n) => n.groupId === fromGroupId && n.id !== noteId)
          .sort((a, b) => a.position - b.position)
          .forEach((n, i) => updates.push({ id: n.id, groupId: fromGroupId, position: i }))
      }
    }

    const byId = new Map(updates.map((u) => [u.id, u]))
    setNotes((current) =>
      current.map((n) => {
        const update = byId.get(n.id)
        return update ? { ...n, groupId: update.groupId, position: update.position } : n
      }),
    )

    try {
      await reorderNotes(updates)
    } catch (err) {
      console.error('Failed to persist note reorder:', err)
      await refresh()
    }
  }

  /** Drag-and-drop column/tab reorder — `orderedGroupIds` is the board's full new group order. */
  async function reorderGroups(orderedGroupIds: string[]) {
    const updates = orderedGroupIds.map((id, position) => ({ id, position }))
    const byId = new Map(updates.map((u) => [u.id, u.position]))
    setGroups((current) =>
      [...current]
        .map((g) => (byId.has(g.id) ? { ...g, position: byId.get(g.id)! } : g))
        .sort((a, b) => a.position - b.position),
    )

    try {
      await reorderGroupsInDb(updates)
    } catch (err) {
      console.error('Failed to persist group reorder:', err)
      if (activeWorkspaceId) setGroups(await listGroups(activeWorkspaceId))
    }
  }

  return {
    groups,
    notes,
    activeGroupId,
    setActiveGroupId,
    notesForGroup,
    refresh,
    moveNote,
    reorderGroups,
  }
}
