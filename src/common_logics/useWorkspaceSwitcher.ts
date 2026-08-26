import { useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'

export function useWorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, createWorkspace, renameWorkspace, deleteWorkspace, switchWorkspace } =
    useWorkspace()

  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setRenamingId(null)
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

  function startRename(id: string, currentName: string) {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameValue('')
  }

  async function confirmRename() {
    if (!renamingId) return
    const name = renameValue.trim()
    if (name) await renameWorkspace(renamingId, name)
    cancelRename()
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
    renamingId,
    renameValue,
    setRenameValue,
    startRename,
    cancelRename,
    confirmRename,
    confirmingDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
