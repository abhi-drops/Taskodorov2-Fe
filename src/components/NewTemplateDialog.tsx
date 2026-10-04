import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { CheckCircle } from './ui/CheckCircle'
import { DIALOG_OVERLAY, DIALOG_SHADOW, FIELD_INPUT, FIELD_LABEL } from './ui/dialogStyles'
import { BLANK_SOURCE, useNewTemplate } from '../common_logics/useNewTemplate'
import { usePlatform } from '../lib/platform/usePlatform'
import type { Template } from '../types/template'

interface NewTemplateDialogProps {
  onClose: () => void
  onCreated: (template: Template) => void
}

/**
 * Create a template: blank, or from one of the user's workspaces. A workspace gives its
 * groups and their settings; its notes are listed so the user can tick the ones to keep
 * as sample notes. Render it only while it should be open (it has no `isOpen` prop).
 */
export function NewTemplateDialog({ onClose, onCreated }: NewTemplateDialogProps) {
  const { isNative } = usePlatform()
  const {
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
  } = useNewTemplate(onCreated)

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New template"
      variant={isNative ? 'bottom-sheet' : 'center'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {/* p-1: room for the chips' offset shadows inside Modal's scroll box. */}
      <form
        className="flex flex-col gap-4 p-1 text-left"
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
            placeholder="Template name"
            className={FIELD_INPUT}
          />
        </label>

        <Select
          label="Start from"
          value={sourceId}
          onChange={changeSource}
          options={[
            { value: BLANK_SOURCE, label: 'Blank template' },
            ...workspaces.map((ws) => ({ value: ws.id, label: `Workspace: ${ws.name}` })),
          ]}
        />

        {isLoadingSource && <p className="text-sm text-slate-500">Loading…</p>}

        {source && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              All {source.groups.length} groups and their settings are copied. Tick the notes to keep as sample notes.
            </p>

            {source.notes.length === 0 ? (
              <p className="text-sm text-slate-500">This workspace has no notes.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="self-start font-display text-sm font-bold uppercase text-ink hover:opacity-70"
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
                {source.groups.map((group) => {
                  const notes = source.notes.filter((note) => note.groupId === group.id)
                  if (notes.length === 0) return null
                  return (
                    <div key={group.id} className="flex flex-col gap-1.5">
                      <span className={FIELD_LABEL}>{group.name}</span>
                      {notes.map((note) => (
                        // A div, not a label or button: CheckCircle is itself a button.
                        <div
                          key={note.id}
                          onClick={() => toggleNote(note.id)}
                          className="flex cursor-pointer items-center gap-3 rounded-card border-2 border-ink bg-white px-3 py-2"
                        >
                          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <CheckCircle
                              checked={selectedNoteIds.has(note.id)}
                              onChange={() => toggleNote(note.id)}
                              size={18}
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{note.title}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canCreate}>
            Create template
          </Button>
        </div>
      </form>
    </Modal>
  )
}
