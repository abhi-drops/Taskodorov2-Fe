import { useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'

export function useWorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, renameWorkspace, deleteWorkspace, switchWorkspace } = useWorkspace()

  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setConfirmingDeleteId(null)
  }

  /** Swaps the workspace list for the "New workspace" dialog. */
  function startCreate() {
    close()
    setIsCreating(true)
  }

  function closeCreate() {
    setIsCreating(false)
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
    isCreating,
    startCreate,
    closeCreate,
    handleSwitch,
    updateName,
    confirmingDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
