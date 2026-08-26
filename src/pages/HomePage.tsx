import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { listGroups } from '../lib/db/groups'
import type { Group } from '../types/group'

export default function HomePage() {
  const { activeWorkspaceId } = useWorkspace()
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) {
        setGroups([])
        return
      }
      const activeGroups = await listGroups(activeWorkspaceId)
      if (!cancelled) setGroups(activeGroups)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <WorkspaceSwitcher />
        <p className="text-slate-600">
          Board UI lands in phase 2.4/2.5 — for now, here's what's in local storage:
        </p>
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id} className="rounded-card bg-white px-4 py-2 shadow-lg">
              {group.name}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
