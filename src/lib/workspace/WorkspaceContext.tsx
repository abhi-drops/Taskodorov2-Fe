import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  listWorkspaces,
  createWorkspace as dbCreateWorkspace,
  createWorkspaceFromTemplate,
  renameWorkspace as dbRenameWorkspace,
  deleteWorkspace as dbDeleteWorkspace,
} from '../db/workspaces'
import { saveActiveWorkspaceId, loadActiveWorkspaceId, clearActiveWorkspaceId } from '../storage/preferences'
import { useSync } from '../sync/useSync'
import { WorkspaceContext } from './workspaceContext'
import type { WorkspaceState } from './workspaceContext'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    workspaces: [],
    activeWorkspaceId: null,
    status: 'loading',
  })
  // Neither this provider nor `useBoard` has a refresh signal of its own — both load
  // on mount only — so a sync pull that wrote something re-runs the same hydrate via
  // this. The existing persistedId-valid?-else-workspaces[0] fallback below already
  // handles the active workspace vanishing in a `use_account` replace.
  const { appliedAt } = useSync()

  useEffect(() => {
    async function hydrate() {
      const [workspaces, persistedId] = await Promise.all([listWorkspaces(), loadActiveWorkspaceId()])
      const activeWorkspaceId =
        (persistedId && workspaces.some((w) => w.id === persistedId) ? persistedId : workspaces[0]?.id) ?? null
      setState({ workspaces, activeWorkspaceId, status: 'ready' })
    }
    hydrate()
  }, [appliedAt])

  async function createWorkspace(name: string, templateId?: string) {
    // A template that was deleted in the meantime falls back to an empty workspace.
    const fromTemplate = templateId ? await createWorkspaceFromTemplate({ name, templateId }) : null
    const createdId = fromTemplate ?? (await dbCreateWorkspace({ name })).id
    const workspaces = await listWorkspaces()
    await saveActiveWorkspaceId(createdId)
    setState({ workspaces, activeWorkspaceId: createdId, status: 'ready' })
  }

  async function renameWorkspace(id: string, name: string) {
    await dbRenameWorkspace(id, name)
    const workspaces = await listWorkspaces()
    setState((s) => ({ ...s, workspaces }))
  }

  async function deleteWorkspace(id: string) {
    await dbDeleteWorkspace(id)
    const workspaces = await listWorkspaces()
    const activeWorkspaceId =
      state.activeWorkspaceId === id ? (workspaces[0]?.id ?? null) : state.activeWorkspaceId

    if (activeWorkspaceId !== state.activeWorkspaceId) {
      if (activeWorkspaceId) await saveActiveWorkspaceId(activeWorkspaceId)
      else await clearActiveWorkspaceId()
    }

    setState({ workspaces, activeWorkspaceId, status: 'ready' })
  }

  function switchWorkspace(id: string) {
    saveActiveWorkspaceId(id)
    setState((s) => ({ ...s, activeWorkspaceId: id }))
  }

  return (
    <WorkspaceContext.Provider
      value={{ ...state, createWorkspace, renameWorkspace, deleteWorkspace, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
