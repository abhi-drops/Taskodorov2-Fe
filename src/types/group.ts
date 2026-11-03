export type SortedBy = 'manual' | 'alphabetical' | 'date' | 'priority'
export type NoteColorMode = 'manual' | 'priority'
export type HideAfterMode = 'never' | 'checked'
export type HideAfterUnit = 'hours' | 'days'

export interface Group {
  id: string
  workspaceId: string
  name: string
  position: number
  sortedBy: SortedBy
  noteColorMode: NoteColorMode
  onCheckMoveToGroupId: string | null
  resetOnMove: boolean
  /** 'checked': a fully checked note leaves the board `hideAfterAmount` `hideAfterUnit`
   *  after it was checked (see `lib/notes/hiddenNotes.ts`). */
  hideAfterMode: HideAfterMode
  hideAfterAmount: number
  hideAfterUnit: HideAfterUnit
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
