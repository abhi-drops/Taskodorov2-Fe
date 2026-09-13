import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsSidebar } from '../components/PowerToolsSidebar'
import { Select } from '../components/ui/Select'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { useGroupSettings } from '../common_logics/useGroupSettings'
import { usePlatform } from '../lib/platform/usePlatform'
import deleteIcon from '../assets/delete.png'
import type { NoteColorMode, SortedBy } from '../types/group'

const DANGER_CHIP =
  'flex w-full items-center justify-center gap-2 rounded-card border-[3px] border-ink bg-sticky-coral px-4 py-3 font-medium text-white shadow-card transition hover:opacity-90'

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { isNative } = usePlatform()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const {
    group,
    siblingGroups,
    status,
    updateSortedBy,
    updateNoteColorMode,
    updateOnCheckMoveTo,
    updateResetOnMove,
    remove,
  } = useGroupSettings(groupId ?? '')

  async function handleDelete() {
    await remove()
    navigate('/power-tools')
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

  const fields = (
    <>
      <Select
        label="Sorted By"
        value={group.sortedBy}
        onChange={(e) => updateSortedBy(e.target.value as SortedBy)}
      >
        <option value="manual">Manual</option>
        <option value="alphabetical">A to Z</option>
        <option value="date">Date</option>
        <option value="priority">Priority</option>
      </Select>

      <Select
        label="On Check Move To"
        value={group.onCheckMoveToGroupId ?? 'none'}
        onChange={(e) => updateOnCheckMoveTo(e.target.value === 'none' ? null : e.target.value)}
      >
        <option value="none">None</option>
        {siblingGroups.map((sg) => (
          <option key={sg.id} value={sg.id}>
            {sg.name}
          </option>
        ))}
      </Select>

      {group.onCheckMoveToGroupId && (
        <Select
          label="Reset To Unchecked On Move"
          value={group.resetOnMove ? 'on' : 'off'}
          onChange={(e) => updateResetOnMove(e.target.value === 'on')}
        >
          <option value="on">On</option>
          <option value="off">Off</option>
        </Select>
      )}

      <Select
        label="Note Colors"
        value={group.noteColorMode}
        onChange={(e) => updateNoteColorMode(e.target.value as NoteColorMode)}
      >
        <option value="manual">Manual</option>
        <option value="random">Random</option>
        <option value="priority">Priority</option>
      </Select>

      <button type="button" onClick={() => setConfirmDelete(true)} className={DANGER_CHIP}>
        <Icon src={deleteIcon} alt="" size={16} className="[filter:brightness(0)_invert(1)]" />
        Delete This Group
      </button>
    </>
  )

  return (
    <AppShell>
      {isNative ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-nav-dark">{group.name}</h1>
            <p className="text-slate-600">Group settings</p>
          </div>
          {fields}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-1 gap-10">
          <PowerToolsSidebar activeTab="groups" />
          <div className="flex flex-1 flex-col gap-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-nav-dark">{group.name}</h1>
              <p className="text-slate-600">Group settings</p>
            </div>
            <div className="flex max-w-sm flex-col gap-6">{fields}</div>
          </div>
        </div>
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
