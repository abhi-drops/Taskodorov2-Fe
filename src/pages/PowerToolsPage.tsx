import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsDesktopLayout, type PowerToolsTab } from '../components/PowerToolsSidebar'
import { useAuth } from '../lib/auth/useAuth'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { usePlatform } from '../lib/platform/usePlatform'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useGroupForm } from '../common_logics/useGroupForm'
import { listGroups, deleteGroup } from '../lib/db/groups'
import { resetToDefault } from '../lib/db/reset'
import type { Group } from '../types/group'
import type { AuthState } from '../lib/auth/authContext'

const CHIP = 'flex items-center gap-3 rounded-card border-[3px] border-ink bg-white px-4 py-3 shadow-card'
const DANGER_CHIP =
  'flex w-full items-center justify-center gap-2 rounded-card border-[3px] border-ink bg-sticky-coral px-4 py-3 font-medium text-white shadow-card transition hover:opacity-90'

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BoxIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 6.5V14l7 3.5 7-3.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 10v7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

function AddonToolsSection() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Addon Tools</SectionHeading>
      <div className={`${CHIP} justify-between opacity-50`}>
        <span className="flex items-center gap-3 font-medium text-ink">
          <ClockIcon className="h-5 w-5" />
          Pomodoro
        </span>
      </div>
    </div>
  )
}

function GroupsSection({
  groups,
  name,
  setName,
  handleCreate,
  onDeleteRequest,
}: {
  groups: Group[]
  name: string
  setName: (value: string) => void
  handleCreate: () => void
  onDeleteRequest: (group: Group) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Groups</SectionHeading>
      {groups.map((group) => (
        <div key={group.id} className={CHIP}>
          <BoxIcon className="h-5 w-5 shrink-0 text-ink" />
          <span className="flex-1 truncate font-medium text-ink">{group.name}</span>
          <Link
            to={`/power-tools/groups/${group.id}`}
            aria-label={`${group.name} settings`}
            className="text-lg leading-none text-ink hover:opacity-70"
          >
            ⚙
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(group)}
            aria-label={`Delete ${group.name}`}
            className="text-lg leading-none text-ink hover:opacity-70"
          >
            ×
          </button>
        </div>
      ))}

      <div className={`${CHIP} justify-between`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
          }}
          placeholder="+ New group"
          className="min-w-0 flex-1 bg-transparent font-medium text-ink outline-none placeholder:text-ink/50"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="shrink-0 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function AccountSection({
  auth,
  onResetRequest,
}: {
  auth: Pick<AuthState, 'user' | 'status'> & { logout: () => Promise<void> }
  onResetRequest: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Account</SectionHeading>

      {auth.status === 'authenticated' ? (
        <div className={`${CHIP} justify-between`}>
          <span className="truncate font-medium text-ink">
            {auth.user?.name ? `${auth.user.name} (${auth.user.email})` : auth.user?.email}
          </span>
          <Button variant="ghost" onClick={auth.logout}>
            Log out
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 px-1">
          <Link to="/login" className="font-medium text-accent-purple">
            Log in
          </Link>
          <Link to="/signup" className="font-medium text-accent-purple">
            Sign up
          </Link>
        </div>
      )}

      <div className={`${CHIP} justify-center opacity-50`}>
        <span className="font-medium text-ink">Sync With Google</span>
      </div>

      <button type="button" onClick={onResetRequest} className={DANGER_CHIP}>
        Reset To Default
      </button>
    </div>
  )
}

export default function PowerToolsPage() {
  const auth = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const { isNative } = usePlatform()
  const [searchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as PowerToolsTab | null) ?? 'groups'

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

  const groupsSection = (
    <GroupsSection
      groups={groups}
      name={name}
      setName={setName}
      handleCreate={handleCreate}
      onDeleteRequest={setConfirmDeleteGroup}
    />
  )
  const accountSection = <AccountSection auth={auth} onResetRequest={() => setConfirmReset(true)} />

  return (
    <AppShell>
      {isNative ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-nav-dark">Power Tools</h1>
            <p className="text-slate-600">Something more for Power Users.</p>
          </div>
          <AddonToolsSection />
          {groupsSection}
          {accountSection}
        </div>
      ) : (
        <PowerToolsDesktopLayout activeTab={activeTab}>
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-nav-dark">Power Tools</h1>
              <p className="text-slate-600">Something more for Power Users.</p>
            </div>
            {activeTab === 'addons' && <AddonToolsSection />}
            {activeTab === 'account' && accountSection}
            {activeTab === 'groups' && groupsSection}
          </div>
        </PowerToolsDesktopLayout>
      )}

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
