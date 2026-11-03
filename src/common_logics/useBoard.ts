import { useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { useSync } from '../lib/sync/useSync'
import { listGroups, reorderGroups as reorderGroupsInDb } from '../lib/db/groups'
import { listNotesByWorkspace, reorderNotes } from '../lib/db/notes'
import { isNoteHidden } from '../lib/notes/hiddenNotes'
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

/** How often the board re-checks which notes have crossed their group's hide threshold. */
const HIDE_RECHECK_MS = 60_000

export function useBoard() {
  const { activeWorkspaceId } = useWorkspace()
  // A sync pull that wrote something re-runs the load effect below — `useBoard` has
  // no refresh signal of its own otherwise (load-on-mount/workspace-change only).
  const { appliedAt } = useSync()
  const [groups, setGroups] = useState<Group[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  /** True once the first load has finished — gates page transitions into the board. */
  const [loaded, setLoaded] = useState(false)
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => lastActiveGroupId)
  /** Groups whose hidden notes the user asked to see ("Show hidden"). Per visit to the
   *  board on purpose: it lives in this hook, which unmounts with `HomePage`. */
  const [revealedGroupIds, setRevealedGroupIds] = useState<Set<string>>(() => new Set())
  // A note hides by the clock, not by an edit, so the board needs its own tick.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), HIDE_RECHECK_MS)
    return () => clearInterval(id)
  }, [])

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
        setLoaded(true)
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
      setLoaded(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, appliedAt])

  /** The notes the board shows for a group: its hidden ones are left out unless revealed. */
  function notesForGroup(group: Group): Note[] {
    const revealed = revealedGroupIds.has(group.id)
    return sortNotes(
      notes.filter((n) => n.groupId === group.id && (revealed || !isNoteHidden(n, group, now))),
      group.sortedBy,
    )
  }

  /** How many of a group's notes its "Hide Notes After" rule is hiding right now. */
  function hiddenCountForGroup(group: Group): number {
    return notes.filter((n) => n.groupId === group.id && isNoteHidden(n, group, now)).length
  }

  function isGroupRevealed(group: Group): boolean {
    return revealedGroupIds.has(group.id)
  }

  function toggleGroupRevealed(group: Group) {
    setRevealedGroupIds((current) => {
      const next = new Set(current)
      if (!next.delete(group.id)) next.add(group.id)
      return next
    })
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
      // `destIndex` counts the notes on screen, which skip any hidden ones, so find the
      // note it points at in the full list and drop in front of that.
      const shown = notesForGroup(destGroup).filter((n) => n.id !== noteId)
      const anchor = shown[destIndex]
      const insertAt = anchor ? ordered.findIndex((n) => n.id === anchor.id) : ordered.length
      ordered.splice(Math.max(0, insertAt), 0, note)
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
    loaded,
    activeGroupId,
    setActiveGroupId,
    notesForGroup,
    hiddenCountForGroup,
    isGroupRevealed,
    toggleGroupRevealed,
    refresh,
    moveNote,
    reorderGroups,
  }
}
