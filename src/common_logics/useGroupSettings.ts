import { useEffect, useState } from 'react'
import { getGroupById, updateGroup, deleteGroup } from '../lib/db/groups'
import type { Group, NoteColorMode, SortedBy } from '../types/group'

export function useGroupSettings(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false
    getGroupById(groupId).then((g) => {
      if (cancelled) return
      setGroup(g)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [groupId])

  async function updateSortedBy(sortedBy: SortedBy) {
    await updateGroup(groupId, { sortedBy })
    setGroup((g) => (g ? { ...g, sortedBy } : g))
  }

  async function updateNoteColorMode(noteColorMode: NoteColorMode) {
    await updateGroup(groupId, { noteColorMode })
    setGroup((g) => (g ? { ...g, noteColorMode } : g))
  }

  async function remove() {
    await deleteGroup(groupId)
  }

  return { group, status, updateSortedBy, updateNoteColorMode, remove }
}
