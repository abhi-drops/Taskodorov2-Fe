import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'
import { SwatchPicker } from './ui/SwatchPicker'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { CloseIcon, TrashIcon } from './ui/icons'
import { SWATCH_TINT_CLASSES } from './ui/swatchColors'
import { DIALOG_OVERLAY, DIALOG_SHADOW, FIELD_INPUT, FIELD_LABEL } from './ui/dialogStyles'
import { DANGER_CHIP } from './SidebarPanelLayout'
import { PRIORITY_COLOR_MAP } from '../lib/notes/resolveNoteColor'
import { usePlatform } from '../lib/platform/usePlatform'
import type { TemplateGroup, TemplateNote } from '../types/template'

interface TemplateNoteDialogProps {
  note: TemplateNote
  group: TemplateGroup
  onClose: () => void
  onPatch: (patch: Partial<Omit<TemplateNote, 'key'>>) => void
  onDelete: () => void
}

/**
 * Edits one sample note in a template: the same fields as the note editor (title,
 * description, type, colour, priority, plus a counter's step and target or a
 * checklist's items), minus everything that is state rather than structure (checked,
 * counter value, statuses). Changes apply as they are made.
 */
export function TemplateNoteDialog({ note, group, onClose, onPatch, onDelete }: TemplateNoteDialogProps) {
  const { isNative } = usePlatform()
  const [newItem, setNewItem] = useState('')
  const byPriority = group.noteColorMode === 'priority'
  const displayColor = byPriority ? PRIORITY_COLOR_MAP[note.priority] : (note.color ?? 'yellow')

  function addItem() {
    const text = newItem.trim()
    if (!text) return
    onPatch({ listItems: [...note.listItems, text] })
    setNewItem('')
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Sample note"
      variant={isNative ? 'bottom-sheet' : 'center'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {/* p-1: room for the chips' offset shadows inside Modal's scroll box. */}
      <div className="flex flex-col gap-5 p-1 text-left">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Title</span>
          <input
            autoFocus={note.title === ''}
            value={note.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Note title"
            className={FIELD_INPUT}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Description</span>
          <textarea
            value={note.description ?? ''}
            onChange={(e) => onPatch({ description: e.target.value === '' ? null : e.target.value })}
            rows={2}
            placeholder="Optional"
            className={`${FIELD_INPUT} resize-none font-normal`}
          />
        </label>

        <Select
          label="Note Type"
          value={note.type}
          onChange={(type) => onPatch({ type })}
          options={[
            { value: 'basic', label: 'Task' },
            { value: 'counter', label: 'Counter' },
            { value: 'list', label: 'Checklist' },
          ]}
        />

        {note.type === 'counter' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Step</span>
              <input
                type="number"
                min={1}
                value={note.counterStep}
                onChange={(e) => onPatch({ counterStep: Math.max(1, Number(e.target.value) || 1) })}
                className={FIELD_INPUT}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Target</span>
              <input
                type="number"
                min={0}
                value={note.counterTarget ?? ''}
                onChange={(e) => onPatch({ counterTarget: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="None"
                className={FIELD_INPUT}
              />
            </label>
          </div>
        )}

        {note.type === 'list' && (
          <div className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Checklist items</span>
            {note.listItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(e) =>
                    onPatch({ listItems: note.listItems.map((text, j) => (j === i ? e.target.value : text)) })
                  }
                  aria-label={`Item ${i + 1}`}
                  className={FIELD_INPUT}
                />
                <button
                  type="button"
                  onClick={() => onPatch({ listItems: note.listItems.filter((_, j) => j !== i) })}
                  aria-label={`Remove item ${i + 1}`}
                  className="shrink-0 text-ink hover:opacity-70"
                >
                  <AnimatedIcon icon={CloseIcon} size={18} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem()
                }}
                placeholder="+ New item"
                className={FIELD_INPUT}
              />
              <button
                type="button"
                onClick={addItem}
                className="shrink-0 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Color</span>
          <SwatchPicker value={displayColor} onChange={(color) => onPatch({ color })} disabled={byPriority} />
          {byPriority && (
            <p
              className={`mt-2.5 rounded-card border-2 border-ink px-3.5 py-2.5 text-sm text-nav-dark ${SWATCH_TINT_CLASSES[displayColor]}`}
            >
              Color is set by priority for this group.
            </p>
          )}
        </div>

        <Select
          label="Priority"
          value={note.priority}
          onChange={(priority) => onPatch({ priority })}
          options={[
            { value: 'low', label: 'low' },
            { value: 'normal', label: 'normal' },
            { value: 'medium', label: 'medium' },
            { value: 'high', label: 'high' },
          ]}
        />

        <button type="button" onClick={onDelete} className={DANGER_CHIP}>
          <AnimatedIcon icon={TrashIcon} size={16} />
          Delete This Note
        </button>
      </div>
    </Modal>
  )
}
