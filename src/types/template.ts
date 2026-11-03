import type { SwatchColor } from '../components/ui/swatchColors'
import type { HideAfterMode, HideAfterUnit, NoteColorMode, SortedBy } from './group'
import type { NoteType, Priority } from './note'

/**
 * A sample note inside a template. It carries structure only, never state: no checked
 * flag, no counter value, no statuses. Those all start fresh in the workspace it creates.
 */
export interface TemplateNote {
  key: string
  type: NoteType
  title: string
  description: string | null
  color: SwatchColor | null
  priority: Priority
  /** Counter notes only. */
  counterStep: number
  counterTarget: number | null
  /** List notes only: the item texts, in order. */
  listItems: string[]
}

/**
 * Groups and notes are identified by template-local `key`s, never database ids: a
 * template outlives any one workspace, and real ids are minted when it is used.
 */
export interface TemplateGroup {
  key: string
  name: string
  sortedBy: SortedBy
  noteColorMode: NoteColorMode
  onCheckMoveToKey: string | null
  resetOnMove: boolean
  hideAfterMode: HideAfterMode
  hideAfterAmount: number
  hideAfterUnit: HideAfterUnit
  notes: TemplateNote[]
}

export interface TemplateContent {
  groups: TemplateGroup[]
  completedGroupKey: string | null
}

export interface Template {
  id: string
  name: string
  /** Set on the templates the app ships with; they can be reset but not deleted. */
  builtinId: string | null
  position: number
  content: TemplateContent
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
