import { useLayoutEffect, useRef, useState } from 'react'
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

function useAutoGrowHeight(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return ref
}

export default function NoteEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group') ?? undefined

  const form = useNoteForm({ groupId, noteId: id })
  const [newItemText, setNewItemText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useAutoGrowHeight(form.status === 'loading' ? '' : form.title)
  const descriptionRef = useAutoGrowHeight(form.status === 'loading' ? '' : form.description)

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
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 lg:max-w-6xl lg:grid lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-12">
        <div className="flex flex-col gap-6">
          <div className={`flex flex-col gap-2 rounded-card p-5 shadow-lg ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
              <textarea
                ref={titleRef}
                value={form.title}
                onChange={(e) => form.setTitle(e.target.value)}
                onBlur={form.handleTitleBlur}
                placeholder="Note Title"
                rows={1}
                className="flex-1 resize-none overflow-hidden break-words bg-transparent text-lg font-bold text-nav-dark outline-none placeholder:text-nav-dark/50"
              />
              {form.type !== 'list' && (
                <CheckCircle checked={form.completed} onChange={form.toggleCompleted} size={22} />
              )}
            </div>
            <textarea
              ref={descriptionRef}
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              onBlur={form.handleDescriptionBlur}
              placeholder="sample description ..."
              rows={3}
              className="max-h-[210px] resize-none overflow-y-auto break-words bg-transparent text-sm text-nav-dark/80 outline-none placeholder:text-nav-dark/50"
            />
          </div>

          {form.type === 'list' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Items</span>
              <div className={`flex flex-col gap-4 rounded-card py-3 pr-4 shadow-card ${colorClass}`}>
                {(form.payload as ListPayload).items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <CheckCircle checked={item.completed} onChange={() => form.toggleItem(item.id)} size={20} />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through opacity-60' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => form.removeItem(item.id)}
                      aria-label={`Remove ${item.text}`}
                      className="text-lg leading-none text-ink hover:opacity-70"
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
                    className="flex-1 bg-transparent pl-3 text-sm text-nav-dark outline-none placeholder:text-nav-dark/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      form.addItem(newItemText)
                      setNewItemText('')
                    }}
                    aria-label="Add item"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card border border-ink bg-white font-display text-lg leading-none text-ink hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {form.type === 'counter' && (
            <div className={`flex gap-4 rounded-card p-4 shadow-card ${colorClass}`}>
              <div className="min-w-0 flex-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-nav-dark">
                  Step
                  <input
                    type="number"
                    min={1}
                    defaultValue={(form.payload as CounterPayload).step}
                    onBlur={(e) => form.handleStepBlur(e.target.value)}
                    className="w-full min-w-0 rounded-card border-2 border-ink bg-white px-3.5 py-2.5 text-nav-dark outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </label>
              </div>
              <div className="min-w-0 flex-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-nav-dark">
                  Target (optional)
                  <input
                    type="number"
                    defaultValue={(form.payload as CounterPayload).target ?? ''}
                    onBlur={(e) => form.handleTargetBlur(e.target.value)}
                    className="w-full min-w-0 rounded-card border-2 border-ink bg-white px-3.5 py-2.5 text-nav-dark outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="mx-auto flex w-full max-w-xs flex-col gap-6">
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

            {!form.isNew && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Icon src={deleteIcon} alt="" size={16} />
                Delete
              </Button>
            )}
          </div>
        </div>
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
