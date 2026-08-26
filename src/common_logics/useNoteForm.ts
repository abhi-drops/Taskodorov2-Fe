import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getNoteById, createNote, updateNote, deleteNote, defaultPayload } from '../lib/db/notes'
import { getGroupById } from '../lib/db/groups'
import type { Group } from '../types/group'
import type { CounterPayload, ListPayload, NotePayload, NoteType, Priority } from '../types/note'
import type { SwatchColor } from '../components/ui/swatchColors'

const SWATCH_COLORS: SwatchColor[] = ['yellow', 'coral', 'blue', 'green']

function randomSwatchColor(): SwatchColor {
  return SWATCH_COLORS[Math.floor(Math.random() * SWATCH_COLORS.length)]
}

interface UseNoteFormArgs {
  groupId?: string
  noteId?: string
}

export function useNoteForm({ groupId, noteId }: UseNoteFormArgs) {
  const navigate = useNavigate()

  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [id, setId] = useState<string | null>(noteId ?? null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(groupId ?? null)
  const [group, setGroup] = useState<Group | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<NoteType>('basic')
  const [color, setColor] = useState<SwatchColor | null>(null)
  const [priority, setPriority] = useState<Priority>('normal')
  const [payload, setPayload] = useState<NotePayload>({})
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (noteId) {
        const note = await getNoteById(noteId)
        if (cancelled || !note) {
          setStatus('ready')
          return
        }
        setId(note.id)
        setWorkspaceId(note.workspaceId)
        setResolvedGroupId(note.groupId)
        setTitle(note.title)
        setDescription(note.description ?? '')
        setType(note.type)
        setColor(note.color as SwatchColor | null)
        setPriority(note.priority)
        setPayload(note.payload)
        setCompleted(note.completed)
        const g = await getGroupById(note.groupId)
        if (!cancelled) setGroup(g)
        setStatus('ready')
      } else if (groupId) {
        const g = await getGroupById(groupId)
        if (cancelled) return
        setGroup(g)
        setWorkspaceId(g?.workspaceId ?? null)
        setPayload(defaultPayload('basic'))
        if (g?.noteColorMode === 'random') setColor(randomSwatchColor())
        setStatus('ready')
      } else {
        setStatus('ready')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [noteId, groupId])

  async function persist(patch: Parameters<typeof updateNote>[1]) {
    if (!id) return
    await updateNote(id, patch)
  }

  async function handleTitleBlur() {
    const trimmed = title.trim()
    setTitle(trimmed)

    if (id) {
      await persist({ title: trimmed })
      return
    }
    if (!trimmed || !workspaceId || !resolvedGroupId) return

    const created = await createNote({
      workspaceId,
      groupId: resolvedGroupId,
      type,
      title: trimmed,
      description: description || null,
      color,
      priority,
      payload,
    })
    setId(created.id)
    navigate(`/notes/${created.id}/edit`, { replace: true })
  }

  function handleDescriptionBlur() {
    persist({ description: description || null })
  }

  function handleTypeChange(nextType: NoteType) {
    const nextPayload = defaultPayload(nextType)
    setType(nextType)
    setPayload(nextPayload)
    persist({ type: nextType, payload: nextPayload })
  }

  function handleColorChange(nextColor: SwatchColor) {
    setColor(nextColor)
    persist({ color: nextColor })
  }

  function handlePriorityChange(nextPriority: Priority) {
    setPriority(nextPriority)
    persist({ priority: nextPriority })
  }

  function toggleCompleted() {
    const next = !completed
    setCompleted(next)
    persist({ completed: next })
  }

  // counter payload
  function handleStepBlur(value: string) {
    const step = Math.max(1, Number(value) || 1)
    const next: CounterPayload = { ...(payload as CounterPayload), step }
    setPayload(next)
    persist({ payload: next })
  }

  function handleTargetBlur(value: string) {
    const target = value.trim() === '' ? null : Number(value)
    const next: CounterPayload = { ...(payload as CounterPayload), target }
    setPayload(next)
    persist({ payload: next })
  }

  // list payload
  function addItem(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const items = (payload as ListPayload).items ?? []
    const next: ListPayload = {
      items: [...items, { id: crypto.randomUUID(), text: trimmed, completed: false, position: items.length }],
    }
    setPayload(next)
    persist({ payload: next })
  }

  function toggleItem(itemId: string) {
    const items = (payload as ListPayload).items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    )
    const next: ListPayload = { items }
    setPayload(next)
    persist({ payload: next })
  }

  function removeItem(itemId: string) {
    const items = (payload as ListPayload).items.filter((item) => item.id !== itemId)
    const next: ListPayload = { items }
    setPayload(next)
    persist({ payload: next })
  }

  async function remove() {
    if (!id) return
    await deleteNote(id)
    navigate('/')
  }

  return {
    status,
    isNew: !id,
    group,
    title,
    setTitle,
    handleTitleBlur,
    description,
    setDescription,
    handleDescriptionBlur,
    type,
    handleTypeChange,
    color,
    handleColorChange,
    priority,
    handlePriorityChange,
    payload,
    completed,
    toggleCompleted,
    handleStepBlur,
    handleTargetBlur,
    addItem,
    toggleItem,
    removeItem,
    remove,
  }
}
