import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { AiGuideIcon, ChatGptIcon, ChevronDownIcon, ClaudeIcon, GeminiIcon, ImportIcon } from './ui/icons'
import { AiGuideDialog } from './AiGuideDialog'
import { FormError } from './ui/FormError'
import { DIALOG_OVERLAY, DIALOG_SHADOW, FIELD_INPUT, FIELD_LABEL } from './ui/dialogStyles'
import { TemplateThumb } from './TemplateThumb'
import { useNewWorkspace } from '../common_logics/useNewWorkspace'
import { usePlatform } from '../lib/platform/usePlatform'

interface NewWorkspaceDialogProps {
  onClose: () => void
  /** Called after the workspace exists and is the active one. */
  onCreated: () => void
  /** Preselects a template (the template editor's "Use template"). */
  initialTemplateId?: string
}

/**
 * Name a new workspace and pick the template it starts from: three templates up front,
 * the rest behind "More templates". Render it only while it should be open (it has no
 * `isOpen` prop), so each opening starts with a clean form.
 */
export function NewWorkspaceDialog({ onClose, onCreated, initialTemplateId }: NewWorkspaceDialogProps) {
  const { isNative } = usePlatform()
  const {
    status,
    visibleTemplates,
    hasMore,
    showAll,
    toggleShowAll,
    name,
    setName,
    selectedTemplateId,
    setSelectedTemplateId,
    importError,
    handleImport,
    isAiOpen,
    openAi,
    closeAi,
    aiError,
    isCreating,
    handleDownloadGuide,
    handleImportAndCreate,
    canCreate,
    handleCreate,
  } = useNewWorkspace(initialTemplateId, onCreated)

  // "Generate with AI" takes the dialog's place (rather than stacking a second modal on
  // top, where one Escape would close both). Closing it comes back here, with the name
  // and selection as they were.
  if (isAiOpen) {
    return (
      <AiGuideDialog
        onClose={closeAi}
        onDownload={handleDownloadGuide}
        onImport={handleImportAndCreate}
        importLabel="Import and create workspace"
        importDescription={`Import that file. It is saved as a new template, and ${
          name.trim() ? `"${name.trim()}"` : 'a new workspace named after it'
        } is created from it.`}
        busy={isCreating}
        error={aiError}
      />
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New workspace"
      variant={isNative ? 'bottom-sheet' : 'center'}
      size={isNative ? 'default' : 'large'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {/* p-1: room for the chips' offset shadows inside Modal's scroll box. On desktop the
          form fills the large panel: the template grid scrolls, the buttons stay put. */}
      <form
        className={`flex flex-col gap-4 p-1 text-left ${isNative ? '' : 'h-full'}`}
        onSubmit={(e) => {
          e.preventDefault()
          handleCreate()
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className={FIELD_INPUT}
          />
        </label>

        <div className={`flex flex-col gap-1.5 ${isNative ? '' : '-m-1 min-h-0 flex-1 overflow-y-auto p-1'}`}>
          <span id="new-workspace-template" className={FIELD_LABEL}>
            Start from
          </span>
          {status === 'loading' ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div role="radiogroup" aria-labelledby="new-workspace-template" className={`grid grid-cols-3 ${isNative ? 'gap-2' : 'gap-4'}`}>
              {visibleTemplates.map((template) => {
                const selected = template.id === selectedTemplateId
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`flex min-w-0 flex-col rounded-card border-[3px] border-ink text-left shadow-card transition-colors ${
                      isNative ? 'gap-1.5 p-1.5' : 'gap-3 p-3'
                    } ${
                      selected ? 'bg-sticky-yellow' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <TemplateThumb content={template.content} size={isNative ? 'small' : 'large'} />
                    <span
                      className={`line-clamp-2 text-ink ${isNative ? 'text-xs' : 'text-base'} ${
                        selected ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {template.name}
                    </span>
                  </button>
                )
              })}
              {/* Not a template: opens the steps for having an AI assistant write one. */}
              <button
                type="button"
                onClick={openAi}
                className={`flex min-w-0 flex-col rounded-card border-[3px] border-dashed border-ink bg-white text-left transition-colors hover:bg-slate-50 ${
                  isNative ? 'gap-1.5 p-1.5' : 'gap-3 p-3'
                }`}
              >
                <span
                  className={`flex items-center justify-center border border-neutral-300 bg-surface text-ink ${
                    isNative ? 'h-12 gap-2' : 'h-32 gap-5'
                  }`}
                >
                  <AnimatedIcon icon={ChatGptIcon} size={isNative ? 18 : 36} />
                  <AnimatedIcon icon={ClaudeIcon} size={isNative ? 18 : 36} />
                  <AnimatedIcon icon={GeminiIcon} size={isNative ? 18 : 36} />
                </span>
                <span className={`flex items-center gap-1.5 font-medium text-ink ${isNative ? 'text-xs' : 'text-base'}`}>
                  <AnimatedIcon icon={AiGuideIcon} size={isNative ? 12 : 16} still />
                  <span className="line-clamp-2">Generate with AI</span>
                </span>
              </button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
            {hasMore && (
              <button
                type="button"
                onClick={toggleShowAll}
                aria-expanded={showAll}
                className="flex items-center gap-1.5 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
              >
                {showAll ? 'Fewer templates' : 'More templates'}
                <AnimatedIcon icon={ChevronDownIcon} size={14} className={showAll ? 'rotate-180' : ''} />
              </button>
            )}
            {/* Adds the file to the stored templates and selects it. */}
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1.5 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
            >
              <AnimatedIcon icon={ImportIcon} size={14} />
              Import template
            </button>
          </div>
          <FormError message={importError} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canCreate}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  )
}
