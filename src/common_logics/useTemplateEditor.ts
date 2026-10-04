import { useEffect, useRef, useState } from 'react'
import { deleteTemplate, getTemplateById, resetBuiltinTemplate, updateTemplate } from '../lib/db/templates'
import type { Template, TemplateContent } from '../types/template'

/** How long edits must pause before the template is saved (same as the note editor). */
const SAVE_DEBOUNCE_MS = 600

/**
 * One template open in the editor. Every edit goes through `edit`, which takes one of
 * the pure functions from `lib/templates/editContent.ts`; the result is shown at once
 * and saved after a short pause, with no Save button (as everywhere else in the app).
 */
export function useTemplateEditor(templateId: string) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  // The newest content not yet written, and the timer that will write it.
  const pending = useRef<{ timer: number; content: TemplateContent } | null>(null)

  useEffect(() => {
    let cancelled = false
    getTemplateById(templateId).then((loaded) => {
      if (cancelled) return
      setTemplate(loaded)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [templateId])

  function flush() {
    const waiting = pending.current
    if (!waiting) return
    window.clearTimeout(waiting.timer)
    pending.current = null
    void updateTemplate(templateId, { content: waiting.content })
  }

  // Leaving the editor mid-pause (e.g. the back button): save what's pending.
  useEffect(() => {
    return () => {
      const waiting = pending.current
      if (!waiting) return
      window.clearTimeout(waiting.timer)
      pending.current = null
      void updateTemplate(templateId, { content: waiting.content })
    }
  }, [templateId])

  function edit(change: (content: TemplateContent) => TemplateContent) {
    if (!template) return
    const content = change(template.content)
    if (content === template.content) return
    setTemplate({ ...template, content })

    if (pending.current) window.clearTimeout(pending.current.timer)
    const timer = window.setTimeout(() => {
      pending.current = null
      void updateTemplate(templateId, { content })
    }, SAVE_DEBOUNCE_MS)
    pending.current = { timer, content }
  }

  async function rename(name: string) {
    await updateTemplate(templateId, { name })
    setTemplate((t) => (t ? { ...t, name } : t))
  }

  /** Built-in templates only: back to what the app ships with. */
  async function reset() {
    // A pending save would land after the reset and undo it.
    if (pending.current) window.clearTimeout(pending.current.timer)
    pending.current = null
    const restored = await resetBuiltinTemplate(templateId)
    if (restored) setTemplate(restored)
  }

  async function remove() {
    if (pending.current) window.clearTimeout(pending.current.timer)
    pending.current = null
    await deleteTemplate(templateId)
  }

  return { template, status, edit, rename, reset, remove, flush }
}
