import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { ChevronDownIcon } from './ui/icons'
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
    canCreate,
    handleCreate,
  } = useNewWorkspace(initialTemplateId, onCreated)

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
            </div>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={toggleShowAll}
              aria-expanded={showAll}
              className="mt-1 flex items-center gap-1.5 self-start font-display text-sm font-bold uppercase text-ink hover:opacity-70"
            >
              {showAll ? 'Fewer templates' : 'More templates'}
              <AnimatedIcon icon={ChevronDownIcon} size={14} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
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
