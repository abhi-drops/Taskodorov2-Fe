import { useEffect, useState } from 'react'
import { createTemplate, listTemplates } from '../lib/db/templates'
import { DEFAULT_BUILTIN_ID } from '../lib/templates/builtins'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { downloadAiGuide, NOT_A_TEMPLATE_MESSAGE, pickTemplateFile } from './useTemplates'
import type { Template } from '../types/template'

/** How many templates the picker shows before "More templates" is pressed. */
const QUICK_PICK_COUNT = 3

/**
 * The "New workspace" dialog: a name plus a template to start from. Mount it only while
 * the dialog is open, so every opening starts from a clean form.
 *
 * `initialTemplateId` preselects a template (the template editor's "Use template");
 * otherwise the built-in Default is selected.
 */
export function useNewWorkspace(initialTemplateId: string | undefined, onCreated: () => void) {
  const { createWorkspace } = useWorkspace()

  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [name, setName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId ?? null)
  const [showAll, setShowAll] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTemplates().then((list) => {
      if (cancelled) return
      const preselected = list.find((t) => t.id === initialTemplateId)
      const selected = preselected ?? list.find((t) => t.builtinId === DEFAULT_BUILTIN_ID) ?? list[0]
      setTemplates(list)
      setSelectedTemplateId(selected?.id ?? null)
      // A preselected template further down the list must be visible from the start.
      if (selected && list.indexOf(selected) >= QUICK_PICK_COUNT) setShowAll(true)
    })
    return () => {
      cancelled = true
    }
  }, [initialTemplateId])

  const all = templates ?? []
  const visibleTemplates = showAll ? all : all.slice(0, QUICK_PICK_COUNT)
  const canCreate = name.trim() !== '' && !isCreating

  /** Imports a template file, adds it to the stored templates and selects it. */
  async function handleImport() {
    setImportError(null)
    const parsed = await pickTemplateFile()
    if (parsed === null) return
    if (parsed === 'invalid') {
      setImportError(NOT_A_TEMPLATE_MESSAGE)
      return
    }
    const created = await createTemplate(parsed)
    setTemplates(await listTemplates())
    setSelectedTemplateId(created.id)
    // It lands at the end of the list, past the first three.
    setShowAll(true)
  }

  async function handleDownloadGuide() {
    setAiError(null)
    try {
      await downloadAiGuide()
    } catch {
      setAiError("Couldn't save the AI guide. Try again.")
    }
  }

  /**
   * The "Generate with AI" path's last step: import the file the assistant wrote, keep
   * it as a new template, and create the workspace from it straight away. The workspace
   * takes the name already typed in the dialog, or the template's own name if none was.
   */
  async function handleImportAndCreate() {
    if (isCreating) return
    setAiError(null)
    const parsed = await pickTemplateFile()
    if (parsed === null) return
    if (parsed === 'invalid') {
      setAiError(NOT_A_TEMPLATE_MESSAGE)
      return
    }
    setIsCreating(true)
    const created = await createTemplate(parsed)
    await createWorkspace(name.trim() || created.name, created.id)
    onCreated()
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || isCreating) return
    setIsCreating(true)
    await createWorkspace(trimmed, selectedTemplateId ?? undefined)
    onCreated()
  }

  return {
    status: templates === null ? ('loading' as const) : ('ready' as const),
    visibleTemplates,
    hasMore: all.length > QUICK_PICK_COUNT,
    showAll,
    toggleShowAll: () => setShowAll((s) => !s),
    name,
    setName,
    selectedTemplateId,
    setSelectedTemplateId,
    importError,
    handleImport,
    isAiOpen,
    openAi: () => setIsAiOpen(true),
    closeAi: () => {
      setIsAiOpen(false)
      setAiError(null)
    },
    aiError,
    isCreating,
    handleDownloadGuide,
    handleImportAndCreate,
    canCreate,
    handleCreate,
  }
}
