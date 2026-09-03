import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { CheckCircle } from '../components/ui/CheckCircle'
import { Select } from '../components/ui/Select'
import { SwatchPicker } from '../components/ui/SwatchPicker'
import { SWATCH_CLASSES } from '../components/ui/swatchColors'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { useNoteForm } from '../common_logics/useNoteForm'
import deleteIcon from '../assets/delete.png'
import type { CounterPayload, ListPayload } from '../types/note'

export default function NoteEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group') ?? undefined

  const form = useNoteForm({ groupId, noteId: id })
  const [newItemText, setNewItemText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (form.status === 'loading') {
    return (
      <AppShell>
        <p className="text-center text-slate-500">Loading…</p>
      </AppShell>
    )
  }

  const colorClass = SWATCH_CLASSES[form.color ?? 'yellow']
  const colorPickerDisabled = form.group?.noteColorMode !== 'manual'

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6">
        <div className={`flex flex-col gap-2 rounded-card p-5 shadow-lg ${colorClass}`}>
          <div className="flex items-start justify-between gap-2">
            <input
              value={form.title}
              onChange={(e) => form.setTitle(e.target.value)}
              onBlur={form.handleTitleBlur}
              placeholder="Note Title"
              className="flex-1 bg-transparent text-lg font-bold text-nav-dark outline-none placeholder:text-nav-dark/50"
            />
            {form.type !== 'list' && (
              <CheckCircle checked={form.completed} onChange={form.toggleCompleted} size={22} />
            )}
          </div>
          <textarea
            value={form.description}
            onChange={(e) => form.setDescription(e.target.value)}
            onBlur={form.handleDescriptionBlur}
            placeholder="sample description ..."
            rows={3}
            className="resize-none bg-transparent text-sm text-nav-dark/80 outline-none placeholder:text-nav-dark/50"
          />
        </div>

        <Select
          label="Note Type"
          value={form.type}
          onChange={(e) => form.handleTypeChange(e.target.value as typeof form.type)}
        >
          <option value="basic">Task</option>
          <option value="counter">Counter</option>
          <option value="list">Checklist</option>
        </Select>

        <div className="flex flex-col gap-1.5 text-left">
          <span className="text-sm font-medium text-slate-700">Color</span>
          <SwatchPicker value={form.color} onChange={form.handleColorChange} disabled={colorPickerDisabled} />
        </div>

        <Select
          label="Priority"
          value={form.priority}
          onChange={(e) => form.handlePriorityChange(e.target.value as typeof form.priority)}
        >
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </Select>

        {form.type === 'counter' && (
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Step
                <input
                  type="number"
                  min={1}
                  defaultValue={(form.payload as CounterPayload).step}
                  onBlur={(e) => form.handleStepBlur(e.target.value)}
                  className="w-full min-w-0 rounded-card border border-slate-200 px-3.5 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-accent-purple"
                />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Target (optional)
                <input
                  type="number"
                  defaultValue={(form.payload as CounterPayload).target ?? ''}
                  onBlur={(e) => form.handleTargetBlur(e.target.value)}
                  className="w-full min-w-0 rounded-card border border-slate-200 px-3.5 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-accent-purple"
                />
              </label>
            </div>
          </div>
        )}

        {form.type === 'list' && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Items</span>
            {(form.payload as ListPayload).items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-card border border-slate-200 px-3 py-2">
                <CheckCircle checked={item.completed} onChange={() => form.toggleItem(item.id)} size={20} />
                <span className={`flex-1 text-sm ${item.completed ? 'line-through opacity-60' : ''}`}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => form.removeItem(item.id)}
                  aria-label={`Remove ${item.text}`}
                  className="text-lg leading-none text-sticky-coral hover:opacity-80"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    form.addItem(newItemText)
                    setNewItemText('')
                  }
                }}
                placeholder="New item"
                className="flex-1 rounded-card border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  form.addItem(newItemText)
                  setNewItemText('')
                }}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {!form.isNew && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Icon src={deleteIcon} alt="" size={16} />
            Delete
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={form.remove}
        title="Delete note"
        message={`Delete "${form.title}"? This can't be undone.`}
      />
    </AppShell>
  )
}
