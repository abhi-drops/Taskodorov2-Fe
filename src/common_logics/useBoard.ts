import { useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { listGroups } from '../lib/db/groups'
import type { Group } from '../types/group'

export function useBoard() {
  const { activeWorkspaceId } = useWorkspace()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) {
        setGroups([])
        setActiveGroupId(null)
        return
      }
      const activeGroups = await listGroups(activeWorkspaceId)
      if (cancelled) return
      setGroups(activeGroups)
      setActiveGroupId((current) =>
        current && activeGroups.some((g) => g.id === current) ? current : (activeGroups[0]?.id ?? null),
      )
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  return { groups, activeGroupId, setActiveGroupId }
}
