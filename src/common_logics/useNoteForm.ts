import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getNoteById, createNote, updateNote, deleteNote, defaultPayload } from '../lib/db/notes'
import { getGroupById } from '../lib/db/groups'
import { applyOnCheckMove, isNoteFullyChecked, type OnCheckMoveResult } from '../lib/notes/onCheckMove'
import { clearNoteMorph } from '../lib/motion/pageTransitions'
import type { Group } from '../types/group'
import type { CounterPayload, ListPayload, NotePayload, NoteStatus, NoteType, Priority } from '../types/note'
import type { SwatchColor } from '../components/ui/swatchColors'

/** How long typing in the title, description or a status must pause before it is saved. */
const SAVE_DEBOUNCE_MS = 600

type DebouncedField = 'title' | 'description' | 'statuses'

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
  const [statuses, setStatuses] = useState<NoteStatus[]>([])
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
        setStatuses(note.statuses)
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
        if (g?.noteColorMode === 'manual') setColor(randomSwatchColor())
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

  // Debounced saves while typing, one pending save per field. Each save captures the
  // value it was scheduled with, so it never reads stale state. Anything that saves the
  // same field directly (blur, add/remove status) must `cancelSave` first, or the older
  // pending save would land afterwards and overwrite it.
  const pendingSaves = useRef(new Map<DebouncedField, { timer: number; run: () => void }>())

  function cancelSave(field: DebouncedField) {
    const pending = pendingSaves.current.get(field)
    if (!pending) return
    window.clearTimeout(pending.timer)
    pendingSaves.current.delete(field)
  }

  function scheduleSave(field: DebouncedField, run: () => void) {
    cancelSave(field)
    const timer = window.setTimeout(() => {
      pendingSaves.current.delete(field)
      run()
    }, SAVE_DEBOUNCE_MS)
    pendingSaves.current.set(field, { timer, run })
  }

  // Leaving the editor mid-pause (e.g. back button, which fires no blur): save what's pending.
  useEffect(() => {
    const pending = pendingSaves.current
    return () => {
      for (const { timer, run } of pending.values()) {
        window.clearTimeout(timer)
        run()
      }
      pending.clear()
    }
  }, [])

  /**
   * After a same-session "On Check Move To" relocation: refresh `group`/
   * `resolvedGroupId` to the destination (otherwise a later re-check in this same
   * editor session would evaluate the stale source group's rule instead of the
   * destination's), and — only when the source group's `resetOnMove` was on — mirror
   * the reset-to-unchecked `applyOnCheckMove` already persisted (`buildResetPatch`)
   * into local state so the open editor doesn't keep showing the note as checked.
   */
  async function syncAfterMove(result: OnCheckMoveResult | null) {
    if (!result) return
    const { destGroupId, reset } = result
    setResolvedGroupId(destGroupId)
    setGroup(await getGroupById(destGroupId))
    if (!reset) return
    if (type === 'list') {
      setPayload((current) => ({
        items: (current as ListPayload).items.map((item) => ({ ...item, completed: false })),
      }))
    } else {
      setCompleted(false)
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    // A new note is still only created on blur (see `handleTitleBlur`), and an emptied
    // title waits for blur too, so a half-retyped title isn't saved as blank.
    const trimmed = value.trim()
    if (id && trimmed) scheduleSave('title', () => persist({ title: trimmed }))
    else cancelSave('title')
  }

  async function handleTitleBlur() {
    cancelSave('title')
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

  function handleDescriptionChange(value: string) {
    setDescription(value)
    if (id) scheduleSave('description', () => persist({ description: value || null }))
  }

  function handleDescriptionBlur() {
    cancelSave('description')
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
    const wasChecked = isNoteFullyChecked({ type, completed, payload })
    const next = !completed
    setCompleted(next)
    persist({ completed: next })
    if (id && group) applyOnCheckMove({ id, type, payload }, group, wasChecked, next).then(syncAfterMove)
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

  function updateItemText(itemId: string, text: string) {
    const items = (payload as ListPayload).items.map((item) =>
      item.id === itemId ? { ...item, text } : item,
    )
    setPayload({ items })
  }

  function handleItemTextBlur(itemId: string) {
    const items = (payload as ListPayload).items
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const trimmed = item.text.trim()
    if (!trimmed) {
      removeItem(itemId)
      return
    }
    const next: ListPayload = { items: items.map((i) => (i.id === itemId ? { ...i, text: trimmed } : i)) }
    setPayload(next)
    persist({ payload: next })
  }

  function toggleItem(itemId: string) {
    const wasChecked = isNoteFullyChecked({ type, completed, payload })
    const items = (payload as ListPayload).items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    )
    const next: ListPayload = { items }
    setPayload(next)
    persist({ payload: next })
    const isChecked = items.length > 0 && items.every((item) => item.completed)
    if (id && group) applyOnCheckMove({ id, type, payload: next }, group, wasChecked, isChecked).then(syncAfterMove)
  }

  function removeItem(itemId: string) {
    const items = (payload as ListPayload).items.filter((item) => item.id !== itemId)
    const next: ListPayload = { items }
    setPayload(next)
    persist({ payload: next })
  }

  // statuses
  function addStatus(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const next: NoteStatus[] = [...statuses, { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() }]
    cancelSave('statuses')
    setStatuses(next)
    persist({ statuses: next })
  }

  function updateStatusText(statusId: string, text: string) {
    setStatuses(statuses.map((s) => (s.id === statusId ? { ...s, text } : s)))
    // An emptied status waits for blur (which removes it) instead of being saved blank.
    const trimmed = text.trim()
    if (id && trimmed) {
      const saved = statuses.map((s) => (s.id === statusId ? { ...s, text: trimmed } : s))
      scheduleSave('statuses', () => persist({ statuses: saved }))
    } else {
      cancelSave('statuses')
    }
  }

  function handleStatusTextBlur(statusId: string) {
    const status = statuses.find((s) => s.id === statusId)
    if (!status) return
    const trimmed = status.text.trim()
    if (!trimmed) {
      removeStatus(statusId)
      return
    }
    const next = statuses.map((s) => (s.id === statusId ? { ...s, text: trimmed } : s))
    cancelSave('statuses')
    setStatuses(next)
    persist({ statuses: next })
  }

  function removeStatus(statusId: string) {
    const next = statuses.filter((s) => s.id !== statusId)
    cancelSave('statuses')
    setStatuses(next)
    persist({ statuses: next })
  }

  async function remove() {
    if (!id) return
    for (const field of [...pendingSaves.current.keys()]) cancelSave(field)
    await deleteNote(id)
    // The card it would morph back into no longer exists, so exit like any other
    // editor close (sheet on mobile, fade on web) instead of a morph.
    clearNoteMorph()
    navigate('/', { viewTransition: true })
  }

  return {
    status,
    isNew: !id,
    group,
    title,
    handleTitleChange,
    handleTitleBlur,
    description,
    handleDescriptionChange,
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
    updateItemText,
    handleItemTextBlur,
    toggleItem,
    removeItem,
    statuses,
    addStatus,
    updateStatusText,
    handleStatusTextBlur,
    removeStatus,
    remove,
  }
}
