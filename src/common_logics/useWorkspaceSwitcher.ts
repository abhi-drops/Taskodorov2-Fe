import { useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'

export function useWorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, createWorkspace, renameWorkspace, deleteWorkspace, switchWorkspace } =
    useWorkspace()

  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setConfirmingDeleteId(null)
    setNewName('')
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    await createWorkspace(name)
    setNewName('')
    close()
  }

  function handleSwitch(id: string) {
    switchWorkspace(id)
    close()
  }

  async function updateName(id: string, name: string) {
    const trimmed = name.trim()
    if (trimmed) await renameWorkspace(id, trimmed)
  }

  function requestDelete(id: string) {
    setConfirmingDeleteId(id)
  }

  function cancelDelete() {
    setConfirmingDeleteId(null)
  }

  async function confirmDelete() {
    if (!confirmingDeleteId) return
    await deleteWorkspace(confirmingDeleteId)
    setConfirmingDeleteId(null)
  }

  return {
    workspaces,
    activeWorkspaceId,
    isOpen,
    open,
    close,
    newName,
    setNewName,
    handleCreate,
    handleSwitch,
    updateName,
    confirmingDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
