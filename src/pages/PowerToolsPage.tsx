import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../lib/auth/useAuth'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useGroupForm } from '../common_logics/useGroupForm'
import { listGroups, deleteGroup } from '../lib/db/groups'
import { resetToDefault } from '../lib/db/reset'
import type { Group } from '../types/group'

export default function PowerToolsPage() {
  const { user, status, logout } = useAuth()
  const { activeWorkspaceId } = useWorkspace()

  const [groups, setGroups] = useState<Group[]>([])
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) return
      const loaded = await listGroups(activeWorkspaceId)
      if (!cancelled) setGroups(loaded)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  async function refreshGroups() {
    if (!activeWorkspaceId) {
      setGroups([])
      return
    }
    setGroups(await listGroups(activeWorkspaceId))
  }

  const { name, setName, handleCreate } = useGroupForm(activeWorkspaceId, refreshGroups)

  async function handleDeleteGroup() {
    if (!confirmDeleteGroup) return
    await deleteGroup(confirmDeleteGroup.id)
    await refreshGroups()
  }

  async function handleReset() {
    await resetToDefault()
    window.location.reload()
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-nav-dark">Power Tools</h1>
          <p className="text-slate-600">Something more for Power Users.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-card bg-white p-6 shadow-lg">
          <h2 className="text-sm font-medium text-slate-700">Addon Tools</h2>
          <Button variant="secondary" disabled>
            Pomodoro
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-card bg-white p-6 shadow-lg">
          <h2 className="text-sm font-medium text-slate-700">Groups</h2>
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2 rounded-card border border-slate-200 px-3 py-2">
              <span className="flex-1 text-sm text-slate-700">{group.name}</span>
              <Link
                to={`/power-tools/groups/${group.id}`}
                aria-label={`${group.name} settings`}
                className="text-lg leading-none text-slate-500 hover:text-slate-700"
              >
                ⚙
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDeleteGroup(group)}
                aria-label={`Delete ${group.name}`}
                className="text-lg leading-none text-sticky-coral hover:opacity-80"
              >
                ×
              </button>
            </div>
          ))}

          <div className="mt-2 flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              placeholder="New group"
              className="flex-1 rounded-card border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple"
            />
            <Button variant="secondary" onClick={handleCreate}>
              + New group
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-card bg-white p-6 text-center shadow-lg">
          <h2 className="text-sm font-medium text-slate-700">Account</h2>
          {status === 'authenticated' ? (
            <>
              <p className="text-slate-600">{user?.name ? `${user.name} (${user.email})` : user?.email}</p>
              <Button variant="ghost" onClick={() => logout()}>
                Log out
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" className="font-medium text-accent-purple">
                Log in
              </Link>
              <Link to="/signup" className="font-medium text-accent-purple">
                Sign up
              </Link>
            </div>
          )}
          <Button variant="secondary" disabled>
            Sync with Google
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset to Default
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteGroup !== null}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={handleDeleteGroup}
        title="Delete group"
        message={`Delete "${confirmDeleteGroup?.name}" and every note in it?`}
      />

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset to Default"
        message="This deletes every workspace, group, and note, and starts fresh with a single default workspace. This can't be undone."
        confirmLabel="Reset"
      />
    </AppShell>
  )
}
