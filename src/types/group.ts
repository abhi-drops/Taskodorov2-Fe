export type SortedBy = 'manual' | 'alphabetical' | 'date' | 'priority'
export type NoteColorMode = 'manual' | 'random' | 'priority'

export interface Group {
  id: string
  workspaceId: string
  name: string
  position: number
  sortedBy: SortedBy
  noteColorMode: NoteColorMode
  onCheckMoveToGroupId: string | null
  resetOnMove: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
