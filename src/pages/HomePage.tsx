import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { listWorkspaces } from '../lib/db/workspaces'
import { listGroups } from '../lib/db/groups'
import type { Workspace } from '../types/workspace'
import type { Group } from '../types/group'

export default function HomePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const workspaces = await listWorkspaces()
      const active = workspaces[0] ?? null
      if (cancelled) return
      setWorkspace(active)

      if (active) {
        const activeGroups = await listGroups(active.id)
        if (!cancelled) setGroups(activeGroups)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-bold text-nav-dark">
          {workspace?.name ?? 'Loading workspace…'}
        </h1>
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
