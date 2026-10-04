import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsDesktopLayout } from '../components/PowerToolsSidebar'
import { CHIP, DANGER_CHIP } from '../components/SidebarPanelLayout'
import { useAuth } from '../lib/auth/useAuth'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { usePlatform } from '../lib/platform/usePlatform'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { CloseIcon, GroupIcon, SettingsIcon } from '../components/ui/icons'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useGroupForm } from '../common_logics/useGroupForm'
import { useAddButtonSettings } from '../common_logics/useAddButtonSettings'
import { Tabs } from '../components/ui/Tabs'
import { ADD_BUTTON_POSITIONS, type AddButtonPosition } from '../lib/storage/preferences'
import { listGroups, deleteGroup } from '../lib/db/groups'
import { getCompletedGroupId, setCompletedGroupId } from '../lib/db/workspaces'
import { Select } from '../components/ui/Select'
import { resetToDefault } from '../lib/db/reset'
import type { Group } from '../types/group'
import type { AuthState } from '../lib/auth/authContext'

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

const ADD_BUTTON_POSITION_LABELS: Record<AddButtonPosition, string> = { high: 'High', medium: 'Medium', low: 'Low' }

/** Mobile-only: web has no floating "+". */
function BoardSection() {
  const { dynamic: enabled, setDynamic: setEnabled, position, setPosition } = useAddButtonSettings()

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Board</SectionHeading>
      <button
        type="button"
        role="switch"
        aria-checked={enabled === true}
        disabled={enabled === null}
        onClick={() => setEnabled(!enabled)}
        className={`${CHIP} justify-between text-left`}
      >
        <span className="font-medium text-ink">Dynamic Add Button</span>
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">
          {enabled === null ? '' : enabled ? 'On' : 'Off'}
        </span>
      </button>
      {position !== null && (
        <div className={`${CHIP} flex-col items-stretch gap-2`}>
          <span className="font-medium text-ink">Add Button Position</span>
          <Tabs
            options={ADD_BUTTON_POSITIONS.map((p) => ({ label: ADD_BUTTON_POSITION_LABELS[p], value: p }))}
            value={position}
            onChange={(value) => setPosition(value as AddButtonPosition)}
          />
        </div>
      )}
    </div>
  )
}

function GroupsSection({
  groups,
  name,
  setName,
  handleCreate,
  onDeleteRequest,
  completedGroupId,
  onCompletedGroupChange,
}: {
  groups: Group[]
  name: string
  setName: (value: string) => void
  handleCreate: () => void
  onDeleteRequest: (group: Group) => void
  completedGroupId: string | null
  onCompletedGroupChange: (groupId: string | null) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Groups</SectionHeading>
      {groups.map((group) => (
        <div key={group.id} className={CHIP}>
          <AnimatedIcon icon={GroupIcon} size={20} still className="text-ink" />
          <span className="flex-1 truncate font-medium text-ink">{group.name}</span>
          <Link
            to={`/settings/groups/${group.id}`}
            aria-label={`${group.name} settings`}
            className="shrink-0 text-ink hover:opacity-70"
          >
            <AnimatedIcon icon={SettingsIcon} size={18} />
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(group)}
            aria-label={`Delete ${group.name}`}
            className="shrink-0 text-ink hover:opacity-70"
          >
            <AnimatedIcon icon={CloseIcon} size={18} />
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

      {/* Diary: notes moved or created into this group count as "Completed" for the day. */}
      <div className="flex flex-col gap-1.5 pt-2">
        <Select
          label="Completed Group"
          value={completedGroupId ?? 'none'}
          onChange={(value) => onCompletedGroupChange(value === 'none' ? null : value)}
          options={[{ value: 'none', label: 'None' }, ...groups.map((group) => ({ value: group.id, label: group.name }))]}
        />
        <p className="px-1 text-xs text-slate-600">
          Notes moved into this group count as Completed in the Diary.
        </p>
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
  // Anything other than 'account' (including an old `?tab=addons` link) lands on Groups.
  const activeTab = searchParams.get('tab') === 'account' ? 'account' : 'groups'

  const [groups, setGroups] = useState<Group[]>([])
  const [completedGroupId, setCompletedGroupIdState] = useState<string | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) return
      const [loaded, completed] = await Promise.all([
        listGroups(activeWorkspaceId),
        getCompletedGroupId(activeWorkspaceId),
      ])
      if (cancelled) return
      setGroups(loaded)
      setCompletedGroupIdState(completed)
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

  async function handleCompletedGroupChange(groupId: string | null) {
    if (!activeWorkspaceId) return
    setCompletedGroupIdState(groupId)
    await setCompletedGroupId(activeWorkspaceId, groupId)
  }

  const groupsSection = (
    <GroupsSection
      groups={groups}
      name={name}
      setName={setName}
      handleCreate={handleCreate}
      onDeleteRequest={setConfirmDeleteGroup}
      completedGroupId={completedGroupId}
      onCompletedGroupChange={handleCompletedGroupChange}
    />
  )
  const accountSection = <AccountSection auth={auth} onResetRequest={() => setConfirmReset(true)} />

  return (
    <AppShell>
      {isNative ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-nav-dark">Settings</h1>
            <p className="text-slate-600">Groups, account & sync.</p>
          </div>
          {groupsSection}
          <BoardSection />
          {accountSection}
        </div>
      ) : (
        <PowerToolsDesktopLayout activeTab={activeTab}>
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-nav-dark">Settings</h1>
              <p className="text-slate-600">Groups, account & sync.</p>
            </div>
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
