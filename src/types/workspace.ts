export interface Workspace {
  id: string
  name: string
  position: number
  completedGroupId: string | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
