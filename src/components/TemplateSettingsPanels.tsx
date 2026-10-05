import { useState, type ReactNode } from 'react'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { Select } from './ui/Select'
import { SwatchPicker } from './ui/SwatchPicker'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GroupIcon,
  PlusIcon,
  ResetIcon,
  SettingsIcon,
  TrashIcon,
} from './ui/icons'
import { SWATCH_CLASSES, SWATCH_TINT_CLASSES } from './ui/swatchColors'
import { CHIP, DANGER_CHIP } from './SidebarPanelLayout'
import { TOOLBAR_BUTTON } from './TemplatesShell'
import { NewTemplateGroupInput } from './TemplateBoard'
import { GroupSettingsFields } from './GroupSettingsFields'
import { PRIORITY_COLOR_MAP } from '../lib/notes/resolveNoteColor'
import type { TemplateContent, TemplateGroup, TemplateNote } from '../types/template'

/**
 * The template editor's three settings views. Each one copies the screen the user
 * already knows for the real thing, so editing a template feels like editing a board:
 * - workspace: Settings' Groups list (row chips, "+ New group", Completed Group);
 * - group: the Group Settings page (big editable name, the same dropdowns, delete);
 * - note: the note editor (the note-coloured title card, items / counter cards, type,
 *   colour, priority, delete).
 *
 * They are plain content with no frame of their own: the desktop editor shows them in
 * its right sidebar, the mobile editor in a full-page modal. Changes apply as they are made.
 */

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

/** Grows a textarea to fit its text (the note editor's title and items do the same). */
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

interface TemplateWorkspaceSettingsProps {
  content: TemplateContent
  isBuiltin: boolean
  /** Off on mobile, where the editor's own tabs and chips already list the groups. */
  showGroups?: boolean
  onSelectGroup: (groupKey: string) => void
  onAddGroup: (name: string) => void
  onDeleteGroup: (groupKey: string) => void
  onCompletedGroupChange: (groupKey: string | null) => void
  /** Reset to Default (built-in) or Delete This Template; the caller confirms. */
  onDangerAction: () => void
}

export function TemplateWorkspaceSettings({
  content,
  isBuiltin,
  showGroups = true,
  onSelectGroup,
  onAddGroup,
  onDeleteGroup,
  onCompletedGroupChange,
  onDangerAction,
}: TemplateWorkspaceSettingsProps) {
  return (
    <div className="flex flex-col gap-6 text-left">
      {showGroups && (
        <div className="flex flex-col gap-3">
          <SectionHeading>Groups</SectionHeading>
          {content.groups.map((group) => (
            <div key={group.key} className={CHIP}>
              <AnimatedIcon icon={GroupIcon} size={20} still className="shrink-0 text-ink" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{group.name}</span>
              <button
                type="button"
                onClick={() => onSelectGroup(group.key)}
                aria-label={`${group.name} settings`}
                className="shrink-0 text-ink hover:opacity-70"
              >
                <AnimatedIcon icon={SettingsIcon} size={18} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(group.key)}
                aria-label={`Delete ${group.name}`}
                className="shrink-0 text-ink hover:opacity-70"
              >
                <AnimatedIcon icon={CloseIcon} size={18} />
              </button>
            </div>
          ))}
          <NewTemplateGroupInput onAdd={onAddGroup} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Select
          label="Completed Group"
          value={content.completedGroupKey ?? 'none'}
          onChange={(value) => onCompletedGroupChange(value === 'none' ? null : value)}
          options={[{ value: 'none', label: 'None' }, ...content.groups.map((g) => ({ value: g.key, label: g.name }))]}
        />
        <p className="px-1 text-xs text-slate-600">Notes that reach this group count as completed in the Diary.</p>
      </div>

      <button type="button" onClick={onDangerAction} className={DANGER_CHIP}>
        <AnimatedIcon icon={isBuiltin ? ResetIcon : TrashIcon} size={16} />
        {isBuiltin ? 'Reset to Default' : 'Delete This Template'}
      </button>
    </div>
  )
}

interface TemplateGroupSettingsProps {
  content: TemplateContent
  group: TemplateGroup
  onPatch: (patch: Partial<Omit<TemplateGroup, 'key' | 'notes'>>) => void
  onMove: (direction: -1 | 1) => void
  onAddNote: () => void
  /** The caller confirms. */
  onDelete: () => void
}

export function TemplateGroupSettings({ content, group, onPatch, onMove, onAddNote, onDelete }: TemplateGroupSettingsProps) {
  const index = content.groups.findIndex((g) => g.key === group.key)
  const siblings = content.groups.filter((g) => g.key !== group.key).map((g) => ({ id: g.key, name: g.name }))

  return (
    <div className="flex flex-col gap-6 text-left">
      <div>
        <input
          key={`${group.key}:${group.name}`}
          defaultValue={group.name}
          onBlur={(e) => {
            const trimmed = e.target.value.trim()
            if (!trimmed) e.target.value = group.name
            else if (trimmed !== group.name) onPatch({ name: trimmed })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          aria-label="Group name"
          className="w-full bg-transparent font-display text-2xl font-bold text-nav-dark outline-none"
        />
        <p className="text-slate-600">Group settings</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index <= 0}
          className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}
        >
          <AnimatedIcon icon={ChevronLeftIcon} size={16} />
          Move left
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index >= content.groups.length - 1}
          className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}
        >
          Move right
          <AnimatedIcon icon={ChevronRightIcon} size={16} />
        </button>
      </div>

      <GroupSettingsFields
        sortedBy={group.sortedBy}
        noteColorMode={group.noteColorMode}
        onCheckMoveTo={group.onCheckMoveToKey}
        resetOnMove={group.resetOnMove}
        siblingGroups={siblings}
        onSortedByChange={(sortedBy) => onPatch({ sortedBy })}
        onNoteColorModeChange={(noteColorMode) => onPatch({ noteColorMode })}
        onCheckMoveToChange={(onCheckMoveToKey) => onPatch({ onCheckMoveToKey })}
        onResetOnMoveChange={(resetOnMove) => onPatch({ resetOnMove })}
      />

      <button type="button" onClick={onAddNote} className={`${CHIP} font-medium text-ink`}>
        <AnimatedIcon icon={PlusIcon} size={20} />
        Add sample note
      </button>

      <button type="button" onClick={onDelete} className={DANGER_CHIP}>
        <AnimatedIcon icon={TrashIcon} size={16} />
        Delete This Group
      </button>
    </div>
  )
}

interface TemplateNoteSettingsProps {
  note: TemplateNote
  group: TemplateGroup
  onPatch: (patch: Partial<Omit<TemplateNote, 'key'>>) => void
  onDelete: () => void
}

export function TemplateNoteSettings({ note, group, onPatch, onDelete }: TemplateNoteSettingsProps) {
  const [newItem, setNewItem] = useState('')
  const byPriority = group.noteColorMode === 'priority'
  const displayColor = byPriority ? PRIORITY_COLOR_MAP[note.priority] : (note.color ?? 'yellow')
  const colorClass = SWATCH_CLASSES[displayColor]
  const numberInput =
    'w-full min-w-0 rounded-card border-2 border-ink bg-white px-3.5 py-2.5 text-nav-dark outline-none focus:ring-2 focus:ring-accent-purple'

  function addItem() {
    const text = newItem.trim()
    if (!text) return
    onPatch({ listItems: [...note.listItems, text] })
    setNewItem('')
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* The note editor's title card, in the note's own colour. */}
      <div className={`flex flex-col gap-2 rounded-card p-5 shadow-card transition-colors duration-300 ${colorClass}`}>
        <textarea
          ref={autoGrow}
          autoFocus={note.title === ''}
          value={note.title}
          onChange={(e) => {
            onPatch({ title: e.target.value })
            autoGrow(e.target)
          }}
          placeholder="Note Title"
          rows={1}
          className="resize-none overflow-hidden break-words bg-transparent text-lg font-bold text-nav-dark outline-none placeholder:text-nav-dark/50"
        />
        <textarea
          value={note.description ?? ''}
          onChange={(e) => onPatch({ description: e.target.value === '' ? null : e.target.value })}
          placeholder="sample description ..."
          rows={3}
          className="max-h-[210px] resize-none overflow-y-auto break-words bg-transparent text-sm text-nav-dark/80 outline-none placeholder:text-nav-dark/50"
        />
      </div>

      {note.type === 'list' && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Items</span>
          <div className={`flex flex-col gap-4 rounded-card py-3 pr-4 shadow-card transition-colors duration-300 ${colorClass}`}>
            {note.listItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea
                  ref={autoGrow}
                  value={item}
                  onChange={(e) => {
                    onPatch({ listItems: note.listItems.map((text, j) => (j === i ? e.target.value : text)) })
                    autoGrow(e.target)
                  }}
                  aria-label={`Item ${i + 1}`}
                  rows={1}
                  className="flex-1 resize-none overflow-hidden break-words bg-transparent pl-3 text-sm text-nav-dark outline-none"
                />
                <button
                  type="button"
                  onClick={() => onPatch({ listItems: note.listItems.filter((_, j) => j !== i) })}
                  aria-label={`Remove item ${i + 1}`}
                  className="mt-0.5 shrink-0 text-ink hover:opacity-70"
                >
                  <AnimatedIcon icon={CloseIcon} size={16} />
                </button>
              </div>
            ))}
            <div className="flex items-start gap-2">
              <textarea
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    addItem()
                  }
                }}
                placeholder="New item"
                rows={1}
                className="flex-1 resize-none overflow-hidden break-words bg-transparent pl-3 text-sm text-nav-dark outline-none placeholder:text-nav-dark/50"
              />
              <button
                type="button"
                onClick={addItem}
                aria-label="Add item"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card border border-ink bg-white text-ink hover:bg-slate-50"
              >
                <AnimatedIcon icon={PlusIcon} size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {note.type === 'counter' && (
        <div className={`flex gap-4 rounded-card p-4 shadow-card transition-colors duration-300 ${colorClass}`}>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-nav-dark">
            Step
            <input
              type="number"
              min={1}
              value={note.counterStep}
              onChange={(e) => onPatch({ counterStep: Math.max(1, Number(e.target.value) || 1) })}
              className={numberInput}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-nav-dark">
            Target (optional)
            <input
              type="number"
              value={note.counterTarget ?? ''}
              onChange={(e) => onPatch({ counterTarget: e.target.value === '' ? null : Number(e.target.value) })}
              className={numberInput}
            />
          </label>
        </div>
      )}

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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Color</span>
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
  )
}

/**
 * The sidebar's heading row for a selected group or note: what is selected, and a close
 * button that goes back to the workspace settings (the Diary's day details do the same).
 */
export function SettingsPanelHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="min-w-0 truncate font-display text-sm font-bold text-nav-dark">{children}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to workspace settings"
          className="shrink-0 text-ink hover:opacity-70"
        >
          <AnimatedIcon icon={CloseIcon} size={16} />
        </button>
      )}
    </div>
  )
}

