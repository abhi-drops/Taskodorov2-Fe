import { useEffect, useState } from 'react'
import { getGroupById, listGroups, updateGroup, deleteGroup } from '../lib/db/groups'
import type { Group, NoteColorMode, SortedBy } from '../types/group'

export function useGroupSettings(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null)
  const [siblingGroups, setSiblingGroups] = useState<Group[]>([])
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false
    getGroupById(groupId).then(async (g) => {
      if (cancelled) return
      setGroup(g)
      if (g) {
        const workspaceGroups = await listGroups(g.workspaceId)
        if (!cancelled) setSiblingGroups(workspaceGroups.filter((sg) => sg.id !== g.id))
      }
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

  async function updateOnCheckMoveTo(onCheckMoveToGroupId: string | null) {
    await updateGroup(groupId, { onCheckMoveToGroupId })
    setGroup((g) => (g ? { ...g, onCheckMoveToGroupId } : g))
  }

  async function updateResetOnMove(resetOnMove: boolean) {
    await updateGroup(groupId, { resetOnMove })
    setGroup((g) => (g ? { ...g, resetOnMove } : g))
  }

  async function remove() {
    await deleteGroup(groupId)
  }

  return {
    group,
    siblingGroups,
    status,
    updateSortedBy,
    updateNoteColorMode,
    updateOnCheckMoveTo,
    updateResetOnMove,
    remove,
  }
}
