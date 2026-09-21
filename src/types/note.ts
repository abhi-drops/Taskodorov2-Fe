export type NoteType = 'basic' | 'counter' | 'list'
export type Priority = 'low' | 'normal' | 'medium' | 'high'

export type BasicPayload = Record<string, never>

export interface CounterPayload {
  value: number
  step: number
  target?: number | null
}

export interface ListItem {
  id: string
  text: string
  completed: boolean
  position: number
}

export interface ListPayload {
  items: ListItem[]
}

export type NotePayload = BasicPayload | CounterPayload | ListPayload

export interface NoteStatus {
  id: string
  text: string
  createdAt: number
}

export interface Note {
  id: string
  workspaceId: string
  groupId: string
  type: NoteType
  title: string
  description: string | null
  color: string | null
  priority: Priority
  position: number
  completed: boolean
  payload: NotePayload
  statuses: NoteStatus[]
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
