import { useEffect, useState } from 'react'
import { listGroups } from '../lib/db/groups'
import { listNotesByWorkspace } from '../lib/db/notes'
import { createTemplate } from '../lib/db/templates'
import { getCompletedGroupId } from '../lib/db/workspaces'
import { workspaceToTemplateContent } from '../lib/templates/fromWorkspace'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import type { Group } from '../types/group'
import type { Note } from '../types/note'
import type { Template } from '../types/template'

/** The "Start from" value for a template with no groups at all. */
export const BLANK_SOURCE = 'blank'

interface WorkspaceSource {
  workspaceId: string
  groups: Group[]
  notes: Note[]
}

/**
 * The "New template" dialog: a name, and either a blank start or one of the user's
 * workspaces. From a workspace, every group and its settings are copied; notes are
 * copied only if the user ticks them (none are ticked to begin with, so personal notes
 * never end up in a template, or an exported file, by accident).
 *
 * Mount it only while the dialog is open, so every opening starts from a clean form.
 */
export function useNewTemplate(onCreated: (template: Template) => void) {
  const { workspaces } = useWorkspace()

  const [name, setName] = useState('')
  const [sourceId, setSourceId] = useState<string>(BLANK_SOURCE)
  const [loaded, setLoaded] = useState<WorkspaceSource | null>(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (sourceId === BLANK_SOURCE) return
    let cancelled = false
    Promise.all([listGroups(sourceId), listNotesByWorkspace(sourceId)]).then(([groups, notes]) => {
      if (!cancelled) setLoaded({ workspaceId: sourceId, groups, notes })
    })
    return () => {
      cancelled = true
    }
  }, [sourceId])

  // Ignore a workspace that is still loading, or one loaded for an earlier choice.
  const source = sourceId !== BLANK_SOURCE && loaded?.workspaceId === sourceId ? loaded : null

  function changeSource(next: string) {
    setSourceId(next)
    setSelectedNoteIds(new Set())
  }

  function toggleNote(noteId: string) {
    setSelectedNoteIds((current) => {
      const next = new Set(current)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }

  const allSelected = source !== null && source.notes.length > 0 && selectedNoteIds.size === source.notes.length

  function toggleAll() {
    if (!source) return
    setSelectedNoteIds(allSelected ? new Set() : new Set(source.notes.map((note) => note.id)))
  }

  const isLoadingSource = sourceId !== BLANK_SOURCE && source === null
  const canCreate = name.trim() !== '' && !isCreating && !isLoadingSource

  async function handleCreate() {
    if (!canCreate) return
    setIsCreating(true)
    const content = source
      ? workspaceToTemplateContent(
          source.groups,
          source.notes.filter((note) => selectedNoteIds.has(note.id)),
          await getCompletedGroupId(source.workspaceId),
        )
      : { groups: [], completedGroupKey: null }
    onCreated(await createTemplate({ name: name.trim(), content }))
  }

  return {
    workspaces,
    name,
    setName,
    sourceId,
    changeSource,
    source,
    isLoadingSource,
    selectedNoteIds,
    toggleNote,
    allSelected,
    toggleAll,
    canCreate,
    handleCreate,
  }
}
