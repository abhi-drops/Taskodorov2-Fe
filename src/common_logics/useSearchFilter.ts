import { useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { listGroups } from '../lib/db/groups'
import { listNotesByWorkspace } from '../lib/db/notes'
import { resolveNoteColor } from '../lib/notes/resolveNoteColor'
import type { Group } from '../types/group'
import type { Note } from '../types/note'
import type { SwatchColor } from '../components/ui/swatchColors'

export type StatusFilter = 'completed' | 'incomplete'
export type PriorityFilter = 'high' | 'medium' | 'low'

export function useSearchFilter() {
  const { activeWorkspaceId } = useWorkspace()
  const [groups, setGroups] = useState<Group[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  const [searchText, setSearchText] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<'all' | string>('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Set<StatusFilter>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<Set<PriorityFilter>>(new Set())
  const [colorFilter, setColorFilter] = useState<Set<SwatchColor>>(new Set())

  async function refresh() {
    if (!activeWorkspaceId) {
      setGroups([])
      setNotes([])
      return
    }
    const [loadedGroups, loadedNotes] = await Promise.all([
      listGroups(activeWorkspaceId),
      listNotesByWorkspace(activeWorkspaceId),
    ])
    setGroups(loadedGroups)
    setNotes(loadedNotes)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeWorkspaceId) {
        setGroups([])
        setNotes([])
        return
      }
      const [loadedGroups, loadedNotes] = await Promise.all([
        listGroups(activeWorkspaceId),
        listNotesByWorkspace(activeWorkspaceId),
      ])
      if (cancelled) return
      setGroups(loadedGroups)
      setNotes(loadedNotes)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  function toggleInSet<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  function toggleStatus(value: StatusFilter) {
    toggleInSet(statusFilter, value, setStatusFilter)
  }

  function togglePriority(value: PriorityFilter) {
    toggleInSet(priorityFilter, value, setPriorityFilter)
  }

  function toggleColor(value: SwatchColor) {
    toggleInSet(colorFilter, value, setColorFilter)
  }

  const groupsById = new Map(groups.map((g) => [g.id, g]))

  const results = notes.filter((note) => {
    if (searchText.trim() && !note.title.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false
    }
    if (selectedGroupId !== 'all' && note.groupId !== selectedGroupId) {
      return false
    }
    if (statusFilter.size > 0) {
      const status: StatusFilter = note.completed ? 'completed' : 'incomplete'
      if (!statusFilter.has(status)) return false
    }
    if (priorityFilter.size > 0) {
      if (note.priority === 'normal' || !priorityFilter.has(note.priority as PriorityFilter)) {
        return false
      }
    }
    if (colorFilter.size > 0) {
      const group = groupsById.get(note.groupId)
      if (!group || !colorFilter.has(resolveNoteColor(note, group))) return false
    }
    return true
  })

  return {
    groups,
    searchText,
    setSearchText,
    selectedGroupId,
    setSelectedGroupId,
    filtersExpanded,
    setFiltersExpanded,
    statusFilter,
    toggleStatus,
    priorityFilter,
    togglePriority,
    colorFilter,
    toggleColor,
    results,
    groupsById,
    refresh,
  }
}
