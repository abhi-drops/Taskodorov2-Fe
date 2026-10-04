import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TemplatesShell, TemplatesToolbar, TOOLBAR_BUTTON } from '../components/TemplatesShell'
import { CHIP } from '../components/SidebarPanelLayout'
import { TemplateThumb } from '../components/TemplateThumb'
import { NewTemplateDialog } from '../components/NewTemplateDialog'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormError } from '../components/ui/FormError'
import { AiGuideIcon, CloseIcon, DuplicateIcon, ExportIcon, ImportIcon, PlusIcon, TemplatesIcon } from '../components/ui/icons'
import { useTemplates } from '../common_logics/useTemplates'
import { countNotes } from '../lib/templates/editContent'
import type { Template } from '../types/template'

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function TemplateRow({
  template,
  onExport,
  onDuplicate,
  onDelete,
}: {
  template: Template
  onExport: () => void
  onDuplicate: () => void
  /** Omitted for built-in templates, which can't be deleted. */
  onDelete?: () => void
}) {
  const action = 'shrink-0 text-ink hover:opacity-70'
  return (
    <div className={CHIP}>
      <Link to={`/apps/templates/${template.id}`} viewTransition className="flex min-w-0 flex-1 items-center gap-3">
        <TemplateThumb content={template.content} className="w-16 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink">{template.name}</span>
          <span className="truncate text-xs text-slate-600">
            {plural(template.content.groups.length, 'group')}, {plural(countNotes(template.content), 'sample note')}
          </span>
        </span>
      </Link>
      <button type="button" onClick={onExport} aria-label={`Export ${template.name}`} className={action}>
        <AnimatedIcon icon={ExportIcon} size={18} />
      </button>
      <button type="button" onClick={onDuplicate} aria-label={`Duplicate ${template.name}`} className={action}>
        <AnimatedIcon icon={DuplicateIcon} size={18} />
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`Delete ${template.name}`} className={action}>
          <AnimatedIcon icon={CloseIcon} size={18} />
        </button>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const {
    builtinTemplates,
    userTemplates,
    status,
    error,
    handleImport,
    handleExport,
    handleDownloadGuide,
    handleDuplicate,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useTemplates()

  function row(template: Template) {
    return (
      <TemplateRow
        key={template.id}
        template={template}
        onExport={() => handleExport(template)}
        onDuplicate={() => handleDuplicate(template.id)}
        onDelete={template.builtinId === null ? () => requestDelete(template.id) : undefined}
      />
    )
  }

  return (
    <TemplatesShell>
      <TemplatesToolbar>
        <div className="flex shrink-0 items-center gap-2 text-nav-dark">
          <AnimatedIcon icon={TemplatesIcon} size={20} />
          <h1 className="font-display text-lg font-bold">Templates</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* A Markdown file to paste into an AI assistant, so it can write a template. */}
          <button type="button" onClick={handleDownloadGuide} className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}>
            <AnimatedIcon icon={AiGuideIcon} size={16} />
            AI Guide
          </button>
          <button type="button" onClick={handleImport} className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}>
            <AnimatedIcon icon={ImportIcon} size={16} />
            Import
          </button>
          <button type="button" onClick={() => setIsCreating(true)} className={`${TOOLBAR_BUTTON} bg-sticky-yellow hover:opacity-90`}>
            <AnimatedIcon icon={PlusIcon} size={16} />
            New template
          </button>
        </div>
      </TemplatesToolbar>

      <p className="text-slate-600">Boards you can start a new workspace from: groups, their settings and a few sample notes.</p>

      <FormError message={error} />

      {status === 'loading' ? (
        <p className="text-center text-slate-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <SectionHeading>Built-in</SectionHeading>
            {builtinTemplates.map(row)}
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeading>Yours</SectionHeading>
            {userTemplates.length === 0 ? (
              <p className="text-sm text-slate-500">
                None yet. Save one of your workspaces as a template, import a template file, or download the AI
                Guide and have an AI assistant write one for you.
              </p>
            ) : (
              userTemplates.map(row)
            )}
          </div>
        </div>
      )}

      {isCreating && (
        <NewTemplateDialog
          onClose={() => setIsCreating(false)}
          onCreated={(template) => navigate(`/apps/templates/${template.id}`)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete template"
        message={`Delete the "${deleteTarget?.name}" template? Workspaces already made from it are not affected.`}
      />
    </TemplatesShell>
  )
}
