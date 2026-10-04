import { useState, type FocusEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TemplatesShell, TemplatesToolbar, TOOLBAR_BUTTON } from '../components/TemplatesShell'
import { NewTemplateGroupInput, TemplateBoard, TemplateNoteList } from '../components/TemplateBoard'
import { TemplateGroupDialog } from '../components/TemplateGroupDialog'
import { TemplateNoteDialog } from '../components/TemplateNoteDialog'
import { NewWorkspaceDialog } from '../components/NewWorkspaceDialog'
import { CHIP, DANGER_CHIP } from '../components/SidebarPanelLayout'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormError } from '../components/ui/FormError'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { ExportIcon, PlusIcon, ResetIcon, SettingsIcon, TrashIcon } from '../components/ui/icons'
import { useTemplateEditor } from '../common_logics/useTemplateEditor'
import { exportTemplate } from '../common_logics/useTemplates'
import {
  addGroup,
  addNote,
  blankNote,
  deleteGroup,
  deleteNote,
  findNote,
  moveGroup,
  newKey,
  patchGroup,
  patchNote,
  setCompletedGroup,
} from '../lib/templates/editContent'
import { usePlatform } from '../lib/platform/usePlatform'

type Confirming = { kind: 'reset' } | { kind: 'delete' } | { kind: 'delete-group'; groupKey: string } | null

export default function TemplateEditorPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { isNative } = usePlatform()
  const { template, status, edit, rename, reset, remove, flush } = useTemplateEditor(templateId ?? '')

  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null)
  const [openNoteKey, setOpenNoteKey] = useState<string | null>(null)
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Confirming>(null)
  const [isUsing, setIsUsing] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  if (status === 'loading') {
    return (
      <TemplatesShell>
        <p className="text-center text-slate-500">Loading…</p>
      </TemplatesShell>
    )
  }

  if (!template) {
    return (
      <TemplatesShell>
        <p className="text-center text-slate-500">This template no longer exists.</p>
      </TemplatesShell>
    )
  }

  const current = template
  const content = template.content
  const isBuiltin = template.builtinId !== null
  const openGroup = content.groups.find((g) => g.key === openGroupKey) ?? null
  const openNote = openNoteKey ? findNote(content, openNoteKey) : null
  // Mobile shows one group at a time, like the board's tabs.
  const activeGroup = content.groups.find((g) => g.key === activeGroupKey) ?? content.groups[0] ?? null

  function handleNameBlur(e: FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim()
    if (!trimmed) {
      e.target.value = current.name
      return
    }
    if (trimmed !== current.name) rename(trimmed)
  }

  function handleAddNote(groupKey: string) {
    const key = newKey(content)
    edit((c) => addNote(c, groupKey, blankNote(key)))
    setOpenNoteKey(key)
  }

  // Like the real editor, a note only exists once it has a title.
  function closeNote() {
    if (openNote && openNote.note.title.trim() === '') edit((c) => deleteNote(c, openNote.note.key))
    setOpenNoteKey(null)
  }

  async function handleExport() {
    setExportError(null)
    try {
      await exportTemplate(current)
    } catch {
      setExportError(`Couldn't export "${current.name}". Try again.`)
    }
  }

  function handleConfirm() {
    if (confirming?.kind === 'reset') reset()
    if (confirming?.kind === 'delete') remove().then(() => navigate('/apps/templates'))
    if (confirming?.kind === 'delete-group') {
      const key = confirming.groupKey
      edit((c) => deleteGroup(c, key))
      setOpenGroupKey(null)
    }
  }

  const confirmCopy =
    confirming?.kind === 'reset'
      ? {
          title: 'Reset template',
          message: `Put "${template.name}" back to how it shipped? Your changes to this template are lost.`,
          confirmLabel: 'Reset',
        }
      : confirming?.kind === 'delete'
        ? {
            title: 'Delete template',
            message: `Delete the "${template.name}" template? Workspaces already made from it are not affected.`,
            confirmLabel: 'Delete',
          }
        : {
            title: 'Delete group',
            message: 'Delete this group and its sample notes from the template?',
            confirmLabel: 'Delete',
          }

  return (
    <TemplatesShell wide>
      <TemplatesToolbar>
        <input
          key={`${template.id}:${template.name}`}
          defaultValue={template.name}
          onBlur={handleNameBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          aria-label="Template name"
          className="min-w-0 flex-1 basis-40 bg-transparent font-display text-lg font-bold text-nav-dark outline-none"
        />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleExport} className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}>
            <AnimatedIcon icon={ExportIcon} size={16} />
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              flush()
              setIsUsing(true)
            }}
            className={`${TOOLBAR_BUTTON} bg-sticky-yellow hover:opacity-90`}
          >
            <AnimatedIcon icon={PlusIcon} size={16} />
            Use template
          </button>
        </div>
      </TemplatesToolbar>

      <p className="text-slate-600">
        A new workspace made from this template starts with these groups and sample notes.
      </p>

      <FormError message={exportError} />

      {isNative ? (
        <div className="flex flex-col gap-4">
          {content.groups.length > 0 && (
            <Tabs
              options={content.groups.map((g) => ({ label: g.name, value: g.key }))}
              value={activeGroup?.key ?? ''}
              onChange={setActiveGroupKey}
            />
          )}
          {activeGroup && (
            <>
              <div className="flex flex-col gap-3">
                <TemplateNoteList
                  group={activeGroup}
                  position={content.groups.indexOf(activeGroup)}
                  onSelectNote={setOpenNoteKey}
                />
              </div>
              <button type="button" onClick={() => handleAddNote(activeGroup.key)} className={`${CHIP} font-medium text-ink`}>
                <AnimatedIcon icon={PlusIcon} size={20} />
                Add sample note
              </button>
              <button type="button" onClick={() => setOpenGroupKey(activeGroup.key)} className={`${CHIP} font-medium text-ink`}>
                <AnimatedIcon icon={SettingsIcon} size={20} />
                <span className="min-w-0 truncate">{activeGroup.name} settings</span>
              </button>
            </>
          )}
          <NewTemplateGroupInput onAdd={(name) => edit((c) => addGroup(c, name))} />
        </div>
      ) : (
        // -mx-6: the board scrolls edge to edge inside the panel's own p-6.
        <div className="-mx-6">
          <TemplateBoard
            content={content}
            onOpenGroup={setOpenGroupKey}
            onAddNote={handleAddNote}
            onSelectNote={setOpenNoteKey}
            onAddGroup={(name) => edit((c) => addGroup(c, name))}
          />
        </div>
      )}

      <div className={`flex flex-col gap-6 ${isNative ? '' : 'max-w-sm'}`}>
        <div className="flex flex-col gap-1.5">
          <Select
            label="Completed Group"
            value={content.completedGroupKey ?? 'none'}
            onChange={(value) => edit((c) => setCompletedGroup(c, value === 'none' ? null : value))}
            options={[{ value: 'none', label: 'None' }, ...content.groups.map((g) => ({ value: g.key, label: g.name }))]}
          />
          <p className="px-1 text-xs text-slate-600">Notes that reach this group count as completed in the Diary.</p>
        </div>

        {isBuiltin ? (
          <button type="button" onClick={() => setConfirming({ kind: 'reset' })} className={DANGER_CHIP}>
            <AnimatedIcon icon={ResetIcon} size={16} />
            Reset to Default
          </button>
        ) : (
          <button type="button" onClick={() => setConfirming({ kind: 'delete' })} className={DANGER_CHIP}>
            <AnimatedIcon icon={TrashIcon} size={16} />
            Delete This Template
          </button>
        )}
      </div>

      {openGroup && (
        <TemplateGroupDialog
          content={content}
          group={openGroup}
          onClose={() => setOpenGroupKey(null)}
          onPatch={(patch) => edit((c) => patchGroup(c, openGroup.key, patch))}
          onMove={(direction) => edit((c) => moveGroup(c, openGroup.key, direction))}
          onDelete={() => setConfirming({ kind: 'delete-group', groupKey: openGroup.key })}
        />
      )}

      {openNote && (
        <TemplateNoteDialog
          note={openNote.note}
          group={openNote.group}
          onClose={closeNote}
          onPatch={(patch) => edit((c) => patchNote(c, openNote.note.key, patch))}
          onDelete={() => {
            edit((c) => deleteNote(c, openNote.note.key))
            setOpenNoteKey(null)
          }}
        />
      )}

      {isUsing && (
        <NewWorkspaceDialog
          initialTemplateId={template.id}
          onClose={() => setIsUsing(false)}
          onCreated={() => navigate('/')}
        />
      )}

      <ConfirmDialog
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirmLabel}
      />
    </TemplatesShell>
  )
}
