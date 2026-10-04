import { useEffect, useState } from 'react'
import { createTemplate, deleteTemplate, duplicateTemplate, listTemplates } from '../lib/db/templates'
import { exportTextFile, pickTextFile } from '../lib/platform/fileTransfer'
import { parseTemplateFile, serializeTemplate, templateFileName } from '../lib/templates/templateFile'
import aiGuide from '../lib/templates/aiGuide.md?raw'
import type { Template, TemplateContent } from '../types/template'

/** Exports one template as a file (download on web, share sheet on Android). */
export function exportTemplate(template: Pick<Template, 'name' | 'content'>): Promise<void> {
  return exportTextFile(
    templateFileName(template.name),
    serializeTemplate(template.name, template.content),
    `${template.name} template`,
  )
}

export const NOT_A_TEMPLATE_MESSAGE =
  "This file isn't a Taskodoro template. Choose a template file exported from Templates or written with the AI Guide."

/**
 * Lets the user pick a template file and reads it. `null` if they picked nothing,
 * `'invalid'` if the file isn't a Taskodoro template.
 */
export async function pickTemplateFile(): Promise<{ name: string; content: TemplateContent } | 'invalid' | null> {
  const text = await pickTextFile()
  if (text === null) return null
  return parseTemplateFile(text) ?? 'invalid'
}

/**
 * Downloads (shares, on Android) the "AI Guide": a Markdown file the user pastes into
 * an AI assistant so it can write or edit a template file. Its source is
 * `lib/templates/aiGuide.md`, which must be kept in step with the file format.
 */
export function downloadAiGuide(): Promise<void> {
  return exportTextFile('taskodoro-template-ai-guide.md', aiGuide, 'Taskodoro template AI guide', 'text/markdown')
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
    const parsed = await pickTemplateFile()
    if (parsed === null) return null
    if (parsed === 'invalid') {
      setError(NOT_A_TEMPLATE_MESSAGE)
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

  async function handleDownloadGuide() {
    setError(null)
    try {
      await downloadAiGuide()
    } catch {
      setError("Couldn't save the AI guide. Try again.")
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
    handleDownloadGuide,
    handleDuplicate,
    deleteTarget: templates.find((t) => t.id === confirmingDeleteId) ?? null,
    requestDelete: setConfirmingDeleteId,
    cancelDelete: () => setConfirmingDeleteId(null),
    confirmDelete,
  }
}
