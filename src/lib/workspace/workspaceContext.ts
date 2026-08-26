import { createContext } from 'react'
import type { Workspace } from '../../types/workspace'

export type WorkspaceStatus = 'loading' | 'ready'

export interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  status: WorkspaceStatus
}

export interface WorkspaceContextValue extends WorkspaceState {
  createWorkspace(name: string): Promise<void>
  renameWorkspace(id: string, name: string): Promise<void>
  deleteWorkspace(id: string): Promise<void>
  switchWorkspace(id: string): void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)
