import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GoogleLogin } from '@react-oauth/google'
import { Link, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsDesktopLayout } from '../components/PowerToolsSidebar'
import { CHIP, DANGER_CHIP } from '../components/SidebarPanelLayout'
import { useAuth } from '../lib/auth/useAuth'
import { useSync } from '../lib/sync/useSync'
import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { useGoogleSignIn } from '../common_logics/useGoogleSignIn'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { usePlatform } from '../lib/platform/usePlatform'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { CloseIcon, GroupIcon, SettingsIcon, SyncIcon, TrashIcon, UpdateIcon } from '../components/ui/icons'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useGroupForm } from '../common_logics/useGroupForm'
import { useAddButtonSettings } from '../common_logics/useAddButtonSettings'
import { Tabs } from '../components/ui/Tabs'
import { ADD_BUTTON_POSITIONS, type AddButtonPosition } from '../lib/storage/preferences'
import { listGroups, deleteGroup } from '../lib/db/groups'
import { wipeWorkspaceNotes } from '../lib/db/notes'
import { getCompletedGroupId, setCompletedGroupId } from '../lib/db/workspaces'
import { Select } from '../components/ui/Select'
import { resetToDefault } from '../lib/db/reset'
import { FormError } from '../components/ui/FormError'
import type { Group } from '../types/group'
import type { AuthState } from '../lib/auth/authContext'

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

const ADD_BUTTON_POSITION_LABELS: Record<AddButtonPosition, string> = { high: 'High', medium: 'Medium', low: 'Low' }

/** Mobile-only: web has no floating "+". */
function BoardSection() {
  const { dynamic: enabled, dynamicAvailable, setDynamic: setEnabled, position, setPosition } = useAddButtonSettings()

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Board</SectionHeading>
      <button
        type="button"
        role="switch"
        aria-checked={enabled === true}
        disabled={enabled === null || !dynamicAvailable}
        onClick={() => setEnabled(!enabled)}
        className={`${CHIP} justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="flex flex-col">
          <span className="font-medium text-ink">Dynamic Add Button</span>
          {!dynamicAvailable && <span className="text-sm text-slate-600">Android app only</span>}
        </span>
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
  onWipeRequest,
}: {
  groups: Group[]
  name: string
  setName: (value: string) => void
  handleCreate: () => void
  onDeleteRequest: (group: Group) => void
  completedGroupId: string | null
  onCompletedGroupChange: (groupId: string | null) => void
  onWipeRequest: () => void
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

      {/* Empties this workspace's board. Groups, their settings and the Diary stay. */}
      <div className="flex flex-col gap-1.5 pt-2">
        <button type="button" onClick={onWipeRequest} className={DANGER_CHIP}>
          <AnimatedIcon icon={TrashIcon} size={16} />
          Wipe All Notes
        </button>
        <p className="px-1 text-xs text-slate-600">
          Removes every note in this workspace. Its groups and Diary history are kept.
        </p>
      </div>
    </div>
  )
}

// A full independent class string rather than `${CHIP} flex-col ...` — CHIP's own
// `flex items-center gap-3` would conflict on `align-items`/`gap` with anything
// appended after it (two same-specificity Tailwind utilities for the same property
// have no guaranteed winner by JSX class-string order; see `Modal.tsx`'s
// `overlayClassName`/`panelClassName` doc for the same rule). Still the board's chip
// anatomy (`rounded-card border-[3px] border-ink shadow-card`), just a column layout.
const GOOGLE_CONNECT_CARD = 'flex flex-col gap-3 rounded-card border-[3px] border-ink bg-white p-4 shadow-card'

/**
 * Sync is gated specifically on having signed in with Google — not on any
 * authenticated session — which is why this chip is its own control, separate from
 * the generic Account row above: a user logged in with email/password sees "Account"
 * as authenticated but this chip still reads as off, and tapping it runs Google
 * Sign-In right here rather than requiring a trip through the Account section.
 */
function SyncChip() {
  const sync = useSync()
  const { isReady, isSubmitting, error, handleNativeSignIn, handleWebCredential } = useGoogleSignIn(null)
  const { isNative } = usePlatform()
  const busy = sync.status === 'syncing' || isSubmitting

  const connecting = sync.status === 'disabled'
  const needsGoogleAuth = connecting || (sync.status === 'error' && sync.failure === 'unauthorized')

  // Web has no programmatic trigger for Google's popup/One Tap flow — the real
  // "Sign in with Google" button has to be the thing the user taps. Rendering our own
  // chip as a second, look-alike button right above it (as this used to do) reads as
  // two separate, competing "sign in with Google" prompts stacked together. One
  // merged card instead: a label/description, then the one real button underneath —
  // nothing else here pretends to be clickable. Native has no such problem (the chip
  // itself genuinely drives the system account picker there), so it keeps using the
  // single clickable-chip shape below, same as the already-connected status chip.
  if (needsGoogleAuth && !isNative) {
    return (
      <div className={GOOGLE_CONNECT_CARD}>
        <div className="flex items-center gap-3">
          <AnimatedIcon icon={SyncIcon} size={20} className="text-ink" still />
          <div className="flex flex-col">
            <span className="font-medium text-ink">Sync With Google</span>
            <span className="text-sm text-slate-600">
              {!isReady
                ? 'Google Sign-In not configured yet.'
                : sync.status === 'error'
                  ? 'Your session expired. Sign in again to sync.'
                  : 'Sign in with Google to sync your board.'}
            </span>
          </div>
        </div>
        {isReady &&
          (isSubmitting ? (
            <Spinner size={20} />
          ) : (
            // No local <GoogleOAuthProvider> here — one already wraps the whole app
            // (`App.tsx`), so this just needs the <GoogleLogin> button itself.
            <GoogleLogin
              onSuccess={(credential) => {
                if (credential.credential) handleWebCredential(credential.credential)
              }}
            />
          ))}
        <FormError message={error} />
      </div>
    )
  }

  function detailFor(): string {
    switch (sync.status) {
      case 'syncing':
        return 'Syncing…'
      case 'needs-strategy':
        return "This device hasn't synced yet. Pick what to keep."
      case 'offline':
        return 'Offline — your changes are saved here and will sync later.'
      case 'error':
        // 'unauthorized' on native only here — the web case already returned above.
        return sync.failure === 'unauthorized'
          ? 'Your session expired. Tap to sign in again.'
          : 'Last sync failed.'
      case 'idle':
        return sync.lastSyncedAt
          ? `Synced ${formatDistanceToNow(sync.lastSyncedAt, { addSuffix: true })}.`
          : 'Not synced yet.'
      default:
        return ''
    }
  }

  function valueFor(): string {
    switch (sync.status) {
      case 'needs-strategy':
        return 'Choose'
      case 'offline':
        return 'Retry'
      case 'error':
        return sync.failure === 'unauthorized' ? 'Log In' : 'Retry'
      default:
        return 'Sync Now'
    }
  }

  function handleClick() {
    // Only reachable here when native (needsGoogleAuth + web already returned above).
    if (needsGoogleAuth) {
      handleNativeSignIn()
      return
    }
    sync.syncNow()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`${CHIP} w-full justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="flex items-center gap-3">
          <AnimatedIcon icon={SyncIcon} size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Sync With Google</span>
            <span className="text-sm text-slate-600">{detailFor()}</span>
          </span>
        </span>
        {busy ? (
          <Spinner size={16} />
        ) : (
          <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">{valueFor()}</span>
        )}
      </button>
      {/* Only ever relevant on native here — a web sign-in failure is shown inside
          the merged card above instead, where the GoogleLogin button actually is. */}
      {isNative && needsGoogleAuth && <FormError message={error} />}
    </div>
  )
}

/** Native only — an Android-distribution concern, see
 * `docs/feat-app-update-check-from-be.md`. Mirrors `SyncChip`'s shape: a status line
 * plus a manual trigger, here `checkNow()` from `AppUpdateProvider` (which also runs
 * this once automatically on app launch — this chip just lets the user re-run it and
 * see the result without waiting for the dismissible banner). */
function UpdateChip() {
  const { isNative } = usePlatform()
  const { status, result, currentVersionName, checkNow } = useAppUpdate()
  const busy = status === 'checking'

  if (!isNative) return null

  function detailFor(): string {
    if (busy) return 'Checking…'
    if (status === 'error') return "Couldn't check for updates."
    if (result?.updateAvailable) return `Version ${result.latestVersion} is available.`
    if (currentVersionName) return `You're on the latest version (v${currentVersionName}).`
    return 'Tap to check for updates.'
  }

  return (
    <button
      type="button"
      onClick={checkNow}
      disabled={busy}
      className={`${CHIP} w-full justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="flex items-center gap-3">
        <AnimatedIcon icon={UpdateIcon} size={20} className="text-ink" />
        <span className="flex flex-col">
          <span className="font-medium text-ink">App Updates</span>
          <span className="text-sm text-slate-600">{detailFor()}</span>
        </span>
      </span>
      {busy ? (
        <Spinner size={16} />
      ) : (
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">Check</span>
      )}
    </button>
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

      {auth.status === 'authenticated' && (
        <div className={`${CHIP} justify-between`}>
          <span className="truncate font-medium text-ink">
            {auth.user?.name ? `${auth.user.name} (${auth.user.email})` : auth.user?.email}
          </span>
          <Button variant="ghost" onClick={auth.logout}>
            Log out
          </Button>
        </div>
      )}

      {/* No separate Log in/Sign up links here — the Sync With Google card below is
          the one sign-in entry point in Settings, since sync needs Google either way;
          email/password login still works, just isn't offered from this page. */}
      <SyncChip />
      <UpdateChip />

      <button type="button" onClick={onResetRequest} className={DANGER_CHIP}>
        Reset To Default
      </button>
    </div>
  )
}

export default function PowerToolsPage() {
  const auth = useAuth()
  const { activeWorkspaceId, workspaces } = useWorkspace()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const { isMobile } = usePlatform()
  const [searchParams] = useSearchParams()
  // Anything other than 'account' (including an old `?tab=addons` link) lands on Groups.
  const activeTab = searchParams.get('tab') === 'account' ? 'account' : 'groups'

  const [groups, setGroups] = useState<Group[]>([])
  const [completedGroupId, setCompletedGroupIdState] = useState<string | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

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

  async function handleWipe() {
    if (!activeWorkspaceId) return
    await wipeWorkspaceNotes(activeWorkspaceId)
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
      onWipeRequest={() => setConfirmWipe(true)}
    />
  )
  const accountSection = <AccountSection auth={auth} onResetRequest={() => setConfirmReset(true)} />

  return (
    <AppShell>
      {isMobile ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
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
              <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
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
        isOpen={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        onConfirm={handleWipe}
        title="Wipe all notes"
        message={`Remove every note in "${activeWorkspace?.name ?? 'this workspace'}"? Its groups, their settings and the Diary's history are kept, but the notes can't be brought back.`}
        confirmLabel="Wipe"
      />

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset to Default"
        message="This erases everything Taskodoro has stored on this device: every workspace, group and note, the Diary's history, your own templates and your settings. It also signs you out here. The app starts again as new. This can't be undone."
        confirmLabel="Reset"
      />
    </AppShell>
  )
}
