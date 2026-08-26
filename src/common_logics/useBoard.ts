import { useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { listGroups } from '../lib/db/groups'
import { listNotesByWorkspace } from '../lib/db/notes'
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

export function useBoard() {
  const { activeWorkspaceId } = useWorkspace()
  const [groups, setGroups] = useState<Group[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

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

  return { groups, activeGroupId, setActiveGroupId, notesForGroup, refresh }
}
