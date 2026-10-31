import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useFillViewportHeight } from '../lib/layout/useFillViewportHeight'
import { useParams, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { BackLink } from '../components/ui/BackLink'
import { CheckCircle } from '../components/ui/CheckCircle'
import { Select } from '../components/ui/Select'
import { SwatchPicker } from '../components/ui/SwatchPicker'
import {
  SWATCH_CLASSES,
  SWATCH_TINT_CLASSES,
  SWATCH_TEXT_CLASSES,
  SWATCH_PLACEHOLDER_TEXT_CLASSES,
} from '../components/ui/swatchColors'
import { resolveNoteColor } from '../lib/notes/resolveNoteColor'
import { sortStatusesNewestFirst, formatStatusTimestamp } from '../lib/notes/noteStatus'
import { DANGER_CHIP } from '../components/SidebarPanelLayout'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { AddSquareIcon, CloseIcon, PlusIcon, TrashIcon } from '../components/ui/icons'
import { useNoteForm } from '../common_logics/useNoteForm'
import { noteMorphName, setNoteMorphColor, useTransitionReady } from '../lib/motion/pageTransitions'
import type { CounterPayload, ListPayload } from '../types/note'

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function useAutoGrowHeight(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (ref.current) autoGrow(ref.current)
  }, [value])

  return ref
}

/**
 * Each column of the two-column (`lg:`) layout scrolls on its own inside `EditorColumns`'
 * fixed height. The padding keeps card shadows from being clipped by the scroll box.
 */
const COLUMN_SCROLL = 'lg:max-h-full lg:overflow-y-auto lg:overscroll-contain lg:p-3'

/**
 * The editor's layout box. Below `lg:` it is one column and the page scrolls as usual.
 * From `lg:` up it is two columns in a box that takes exactly the rest of the screen
 * (measured, so the page itself never scrolls); a column taller than that scrolls by
 * itself, and a shorter one stays vertically centred.
 */
function EditorColumns({ children }: { children: ReactNode }) {
  const [ref, height] = useFillViewportHeight<HTMLDivElement>()
  return (
    <div
      ref={ref}
      // Until the first measurement (one frame), a conservative guess that can't overflow.
      style={{ '--editor-height': height ? `${height}px` : 'calc(100svh - 12rem)' } as CSSProperties}
      className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 lg:grid lg:h-[var(--editor-height)] lg:max-w-6xl lg:flex-none lg:grid-cols-[2fr_3fr] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-12"
    >
      {children}
    </div>
  )
}

export default function NoteEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group') ?? undefined

  const form = useNoteForm({ groupId, noteId: id })
  const [newItemText, setNewItemText] = useState('')
  const [newStatusText, setNewStatusText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useAutoGrowHeight(form.status === 'loading' ? '' : form.title)
  const descriptionRef = useAutoGrowHeight(form.status === 'loading' ? '' : form.description)
  const newItemRef = useAutoGrowHeight(newItemText)
  const newStatusRef = useAutoGrowHeight(newStatusText)
  useTransitionReady(form.status !== 'loading')

  // Keep the morph block's colour in sync with the note, so closing morphs back in the
  // current colour even if it was changed while editing (pageTransitions.ts).
  const morphColor =
    form.status === 'loading'
      ? null
      : form.group
        ? resolveNoteColor({ color: form.color, priority: form.priority }, form.group)
        : (form.color ?? 'yellow')
  useLayoutEffect(() => {
    if (morphColor && noteMorphName(id)) setNoteMorphColor(morphColor)
  }, [morphColor, id])

  if (form.status === 'loading') {
    return (
      <AppShell>
        <p className="text-center text-slate-500">Loading…</p>
      </AppShell>
    )
  }

  const displayColor = form.group
    ? resolveNoteColor({ color: form.color, priority: form.priority }, form.group)
    : (form.color ?? 'yellow')
  const colorClass = SWATCH_CLASSES[displayColor]
  const statusTextColorClass = SWATCH_TEXT_CLASSES[displayColor]
  const statusPlaceholderClass = SWATCH_PLACEHOLDER_TEXT_CLASSES[displayColor]
  const colorPickerDisabled = form.group?.noteColorMode !== 'manual'

  return (
    <AppShell>
      <BackLink />
      <EditorColumns>
        <div className={`flex flex-col gap-6 ${COLUMN_SCROLL}`}>
          {/* Morph target when this note was opened from its card (pageTransitions.ts). */}
          <div
            className={`flex flex-col gap-2 rounded-card p-5 shadow-lg ${colorClass}`}
            style={{ viewTransitionName: noteMorphName(id) }}
          >
            <div className="flex items-start justify-between gap-2">
              <textarea
                ref={titleRef}
                value={form.title}
                onChange={(e) => form.handleTitleChange(e.target.value)}
                onBlur={form.handleTitleBlur}
                placeholder="Note Title"
                rows={1}
                className="flex-1 resize-none overflow-hidden break-words bg-transparent text-lg font-bold text-ink outline-none placeholder:text-ink/50"
              />
              {form.type !== 'list' && (
                <CheckCircle checked={form.completed} onChange={form.toggleCompleted} size={22} />
              )}
            </div>
            <textarea
              ref={descriptionRef}
              value={form.description}
              onChange={(e) => form.handleDescriptionChange(e.target.value)}
              onBlur={form.handleDescriptionBlur}
              placeholder="sample description ..."
              rows={3}
              className="max-h-[210px] resize-none overflow-y-auto break-words bg-transparent text-sm text-ink/80 outline-none placeholder:text-ink/50"
            />
          </div>

          {form.type === 'list' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Items</span>
              <div className={`flex flex-col gap-4 rounded-card py-3 pr-4 shadow-card ${colorClass}`}>
                {(form.payload as ListPayload).items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <CheckCircle
                      checked={item.completed}
                      onChange={() => form.toggleItem(item.id)}
                      size={20}
                      className="mt-0.5"
                    />
                    <textarea
                      ref={(el) => {
                        if (el) autoGrow(el)
                      }}
                      value={item.text}
                      onChange={(e) => {
                        form.updateItemText(item.id, e.target.value)
                        autoGrow(e.target)
                      }}
                      onBlur={() => form.handleItemTextBlur(item.id)}
                      rows={1}
                      className={`flex-1 resize-none overflow-hidden break-words bg-transparent text-sm outline-none ${item.completed ? 'line-through opacity-60' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => form.removeItem(item.id)}
                      aria-label={`Remove ${item.text}`}
                      className="mt-0.5 shrink-0 text-ink hover:opacity-70"
                    >
                      <AnimatedIcon icon={CloseIcon} size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-start gap-2">
                  <textarea
                    ref={newItemRef}
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        form.addItem(newItemText)
                        setNewItemText('')
                      }
                    }}
                    placeholder="New item"
                    rows={1}
                    className="flex-1 resize-none overflow-hidden break-words bg-transparent pl-3 text-sm text-ink outline-none placeholder:text-ink/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      form.addItem(newItemText)
                      setNewItemText('')
                    }}
                    aria-label="Add item"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card border border-ink bg-white text-ink hover:bg-slate-50"
                  >
                    <AnimatedIcon icon={PlusIcon} size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {form.type === 'counter' && (
            <div className={`flex gap-4 rounded-card p-4 shadow-card ${colorClass}`}>
              <div className="min-w-0 flex-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                  Step
                  <input
                    type="number"
                    min={1}
                    defaultValue={(form.payload as CounterPayload).step}
                    onBlur={(e) => form.handleStepBlur(e.target.value)}
                    className="w-full min-w-0 rounded-card border-2 border-ink bg-white px-3.5 py-2.5 text-ink outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </label>
              </div>
              <div className="min-w-0 flex-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                  Target (optional)
                  <input
                    type="number"
                    defaultValue={(form.payload as CounterPayload).target ?? ''}
                    onBlur={(e) => form.handleTargetBlur(e.target.value)}
                    className="w-full min-w-0 rounded-card border-2 border-ink bg-white px-3.5 py-2.5 text-ink outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </label>
              </div>
            </div>
          )}

          {!form.isNew && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Status</span>
              {/* Right padding and the 22px button boxes below match the title card's
                  `p-5` + 22px checkbox, so the checkbox, remove and add icons share one
                  vertical centre line. `h-5` centres each icon on its row's first text line. */}
              <div className="flex flex-col gap-4 rounded-card bg-ink py-3 pr-5 shadow-card">
                {sortStatusesNewestFirst(form.statuses).map((s) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <textarea
                        ref={(el) => {
                          if (el) autoGrow(el)
                        }}
                        value={s.text}
                        onChange={(e) => {
                          form.updateStatusText(s.id, e.target.value)
                          autoGrow(e.target)
                        }}
                        onBlur={() => form.handleStatusTextBlur(s.id)}
                        rows={1}
                        className={`w-full resize-none overflow-hidden break-words bg-transparent pl-3 text-sm font-semibold outline-none ${statusTextColorClass}`}
                      />
                      <span className={`pl-3 text-xs font-semibold opacity-70 ${statusTextColorClass}`}>
                        {formatStatusTimestamp(s.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => form.removeStatus(s.id)}
                      aria-label="Remove status"
                      className={`flex h-5 w-[22px] shrink-0 items-center justify-center hover:opacity-70 ${statusTextColorClass}`}
                    >
                      <AnimatedIcon icon={CloseIcon} size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-start gap-2">
                  <textarea
                    ref={newStatusRef}
                    value={newStatusText}
                    onChange={(e) => setNewStatusText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        form.addStatus(newStatusText)
                        setNewStatusText('')
                      }
                    }}
                    placeholder="New status"
                    rows={1}
                    className={`flex-1 resize-none overflow-hidden break-words bg-transparent pl-3 text-sm font-semibold outline-none ${statusTextColorClass} ${statusPlaceholderClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      form.addStatus(newStatusText)
                      setNewStatusText('')
                    }}
                    aria-label="Add status"
                    className={`flex h-5 w-[22px] shrink-0 items-center justify-center hover:opacity-70 ${statusTextColorClass}`}
                  >
                    <AnimatedIcon icon={AddSquareIcon} size={24} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-6 ${COLUMN_SCROLL}`}>
          <div className="mx-auto flex w-full flex-col gap-6 lg:max-w-xs">
            <Select
              label="Note Type"
              value={form.type}
              onChange={form.handleTypeChange}
              options={[
                { value: 'basic', label: 'Task' },
                { value: 'counter', label: 'Counter' },
                { value: 'list', label: 'Checklist' },
              ]}
            />

            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-sm font-medium text-slate-700">Color</span>
              <SwatchPicker value={displayColor} onChange={form.handleColorChange} disabled={colorPickerDisabled} />
              {form.group?.noteColorMode === 'priority' && (
                <p
                  className={`mt-2.5 rounded-card border-2 border-ink px-3.5 py-2.5 text-sm text-ink ${SWATCH_TINT_CLASSES[displayColor]}`}
                >
                  Color is set by priority for this group.
                </p>
              )}
            </div>

            <Select
              label="Priority"
              value={form.priority}
              onChange={form.handlePriorityChange}
              options={[
                { value: 'low', label: 'low' },
                { value: 'normal', label: 'normal' },
                { value: 'medium', label: 'medium' },
                { value: 'high', label: 'high' },
              ]}
            />

            {!form.isNew && (
              <button type="button" onClick={() => setConfirmDelete(true)} className={DANGER_CHIP}>
                <AnimatedIcon icon={TrashIcon} size={16} />
                Delete
              </button>
            )}
          </div>
        </div>
      </EditorColumns>

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
