import { useState, type FocusEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsDesktopLayout } from '../components/PowerToolsSidebar'
import { DANGER_CHIP } from '../components/SidebarPanelLayout'
import { Select } from '../components/ui/Select'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { TrashIcon } from '../components/ui/icons'
import { useGroupSettings } from '../common_logics/useGroupSettings'
import { usePlatform } from '../lib/platform/usePlatform'

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { isNative } = usePlatform()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const {
    group,
    siblingGroups,
    status,
    updateName,
    updateSortedBy,
    updateNoteColorMode,
    updateOnCheckMoveTo,
    updateResetOnMove,
    remove,
  } = useGroupSettings(groupId ?? '')

  async function handleDelete() {
    await remove()
    navigate('/settings')
  }

  if (status === 'loading') {
    return (
      <AppShell>
        <p className="text-center text-slate-500">Loading…</p>
      </AppShell>
    )
  }

  if (!group) {
    return (
      <AppShell>
        <p className="text-center text-slate-500">This group no longer exists.</p>
      </AppShell>
    )
  }

  const currentGroup = group

  function handleNameBlur(e: FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim()
    if (!trimmed) {
      e.target.value = currentGroup.name
      return
    }
    if (trimmed !== currentGroup.name) updateName(trimmed)
  }

  const fields = (
    <>
      <Select
        label="Sorted By"
        value={group.sortedBy}
        onChange={updateSortedBy}
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'alphabetical', label: 'A to Z' },
          { value: 'date', label: 'Date' },
          { value: 'priority', label: 'Priority' },
        ]}
      />

      <Select
        label="On Check Move To"
        value={group.onCheckMoveToGroupId ?? 'none'}
        onChange={(value) => updateOnCheckMoveTo(value === 'none' ? null : value)}
        options={[{ value: 'none', label: 'None' }, ...siblingGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
      />

      {group.onCheckMoveToGroupId && (
        <Select
          label="Reset To Unchecked On Move"
          value={group.resetOnMove ? 'on' : 'off'}
          onChange={(value) => updateResetOnMove(value === 'on')}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
      )}

      <Select
        label="Note Colors"
        value={group.noteColorMode}
        onChange={updateNoteColorMode}
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'priority', label: 'Priority' },
        ]}
      />

      <button type="button" onClick={() => setConfirmDelete(true)} className={DANGER_CHIP}>
        <AnimatedIcon icon={TrashIcon} size={16} />
        Delete This Group
      </button>
    </>
  )

  const nameField = (
    <input
      key={group.id}
      defaultValue={group.name}
      onBlur={handleNameBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      aria-label="Group name"
      // An <input> doesn't inherit `text-align` from the mobile header's `text-center`
      // wrapper, so it needs its own.
      className={`w-full bg-transparent font-display text-2xl font-bold text-nav-dark outline-none ${
        isNative ? 'text-center' : ''
      }`}
    />
  )

  return (
    <AppShell>
      {isNative ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6">
          <div className="text-center">
            {nameField}
            <p className="text-slate-600">Group settings</p>
          </div>
          {fields}
        </div>
      ) : (
        <PowerToolsDesktopLayout activeTab="groups">
          <div className="flex flex-col gap-6">
            <div>
              {nameField}
              <p className="text-slate-600">Group settings</p>
            </div>
            <div className="flex flex-col gap-6">{fields}</div>
          </div>
        </PowerToolsDesktopLayout>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete group"
        message={`Delete "${group.name}" and every note in it? This can't be undone.`}
      />
    </AppShell>
  )
}
