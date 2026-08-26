import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { useGroupSettings } from '../common_logics/useGroupSettings'
import deleteIcon from '../assets/delete.png'
import type { NoteColorMode, SortedBy } from '../types/group'

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { group, status, updateSortedBy, updateNoteColorMode, remove } = useGroupSettings(groupId ?? '')

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

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-nav-dark">{group.name}</h1>
          <p className="text-slate-600">Group settings</p>
        </div>

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

        <Select label="On Check Move To" value="none" disabled>
          <option value="none">none</option>
        </Select>

        <Select
          label="Note Colors"
          value={group.noteColorMode}
          onChange={(e) => updateNoteColorMode(e.target.value as NoteColorMode)}
        >
          <option value="manual">Manual</option>
          <option value="random">Random</option>
          <option value="priority">Priority</option>
        </Select>

        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <Icon src={deleteIcon} alt="" size={16} />
          Delete This Group
        </Button>
      </div>

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
