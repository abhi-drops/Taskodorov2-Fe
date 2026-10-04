import { useEffect, useState } from 'react'
import { createTemplate, deleteTemplate, duplicateTemplate, listTemplates } from '../lib/db/templates'
import { exportTextFile, pickTextFile } from '../lib/platform/fileTransfer'
import { parseTemplateFile, serializeTemplate, templateFileName } from '../lib/templates/templateFile'
import type { Template } from '../types/template'

/** Exports one template as a file (download on web, share sheet on Android). */
export function exportTemplate(template: Pick<Template, 'name' | 'content'>): Promise<void> {
  return exportTextFile(
    templateFileName(template.name),
    serializeTemplate(template.name, template.content),
    `${template.name} template`,
  )
}

/** The Templates app's list: every stored template, plus import, export, duplicate and delete. */
export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function refresh() {
    setTemplates(await listTemplates())
  }

  useEffect(() => {
    let cancelled = false
    listTemplates().then((list) => {
      if (cancelled) return
      setTemplates(list)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** Resolves with the imported template, or `null` if nothing was imported. */
  async function handleImport(): Promise<Template | null> {
    setError(null)
    const text = await pickTextFile()
    if (text === null) return null
    const parsed = parseTemplateFile(text)
    if (!parsed) {
      setError("This file isn't a Taskodoro template. Choose a file exported from Templates.")
      return null
    }
    const created = await createTemplate(parsed)
    await refresh()
    return created
  }

  async function handleExport(template: Template) {
    setError(null)
    try {
      await exportTemplate(template)
    } catch {
      setError(`Couldn't export "${template.name}". Try again.`)
    }
  }

  async function handleDuplicate(id: string) {
    await duplicateTemplate(id)
    await refresh()
  }

  async function confirmDelete() {
    if (!confirmingDeleteId) return
    await deleteTemplate(confirmingDeleteId)
    setConfirmingDeleteId(null)
    await refresh()
  }

  return {
    builtinTemplates: templates.filter((t) => t.builtinId !== null),
    userTemplates: templates.filter((t) => t.builtinId === null),
    status,
    error,
    handleImport,
    handleExport,
    handleDuplicate,
    deleteTarget: templates.find((t) => t.id === confirmingDeleteId) ?? null,
    requestDelete: setConfirmingDeleteId,
    cancelDelete: () => setConfirmingDeleteId(null),
    confirmDelete,
  }
}
