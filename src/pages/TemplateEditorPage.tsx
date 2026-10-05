import { useState, type FocusEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  TEMPLATE_SETTINGS_PANEL_KEY,
  TemplatesShell,
  TemplatesToolbar,
  TOOLBAR_BUTTON,
} from '../components/TemplatesShell'
import { NewTemplateGroupInput, TemplateBoard, TemplateNoteList } from '../components/TemplateBoard'
import {
  SettingsPanelHeader,
  TemplateGroupSettings,
  TemplateNoteSettings,
  TemplateWorkspaceSettings,
} from '../components/TemplateSettingsPanels'
import { NewWorkspaceDialog } from '../components/NewWorkspaceDialog'
import { CHIP } from '../components/SidebarPanelLayout'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormError } from '../components/ui/FormError'
import { Modal } from '../components/ui/Modal'
import { SidePanel } from '../components/ui/SidePanel'
import { SidebarToggle } from '../components/ui/SidebarToggle'
import { Tabs } from '../components/ui/Tabs'
import { DIALOG_OVERLAY, DIALOG_SHADOW } from '../components/ui/dialogStyles'
import { ExportIcon, ImportIcon, PlusIcon, SettingsIcon } from '../components/ui/icons'
import { useTemplateEditor } from '../common_logics/useTemplateEditor'
import { exportTemplate, NOT_A_TEMPLATE_MESSAGE, pickTemplateFile } from '../common_logics/useTemplates'
import {
  addGroup,
  addNote,
  blankNote,
  countNotes,
  deleteGroup,
  deleteNote,
  findNote,
  moveGroup,
  newKey,
  patchGroup,
  patchNote,
  setCompletedGroup,
} from '../lib/templates/editContent'
import { useFillViewportHeight } from '../lib/layout/useFillViewportHeight'
import { usePlatform } from '../lib/platform/usePlatform'
import type { TemplateContent } from '../types/template'

/** What the settings sidebar (desktop) or full-page modal (mobile) is showing. */
type Selection = { kind: 'group'; key: string } | { kind: 'note'; key: string } | null

type Confirming =
  | { kind: 'reset' }
  | { kind: 'delete' }
  | { kind: 'delete-group'; groupKey: string }
  /** A template file has been picked and read; replacing waits for a yes. */
  | { kind: 'replace'; content: TemplateContent }
  | null

/**
 * Desktop: the board beside the settings sidebar. Its own component so it mounts only
 * once the template has loaded: `useFillViewportHeight` measures the element it finds
 * at mount, and there is no board to measure while the page shows "Loading…".
 */
function BoardWithSettings({
  board,
  openRequest,
  children,
}: {
  board: ReactNode
  /** Selecting a group or note always reveals its settings. */
  openRequest: string | null
  children: ReactNode
}) {
  const [boardRef, boardHeight] = useFillViewportHeight<HTMLDivElement>()
  // Until the first measurement (one frame), a conservative guess that can't overflow.
  const fillHeight = boardHeight ?? 'calc(100svh - 20rem)'

  return (
    // No flex gap: the settings SidePanel owns it, so it closes when collapsed.
    <div className="flex items-start">
      {/* Measured height: fills the rest of the screen; the board scrolls inside. */}
      <div ref={boardRef} style={{ height: fillHeight }} className="min-w-0 flex-1 border border-neutral-300 bg-white">
        {board}
      </div>

      <SidePanel
        side="right"
        storageKey={TEMPLATE_SETTINGS_PANEL_KEY}
        label="Settings"
        defaultWidth={320}
        minWidth={260}
        maxWidth={560}
        openRequest={openRequest}
        // Same measured height as the board, so both end at the same line.
        maxHeight={fillHeight}
        panelClassName="flex flex-col gap-4 border border-neutral-300 bg-surface p-4 shadow-card"
      >
        {children}
      </SidePanel>
    </div>
  )
}

export default function TemplateEditorPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { isNative } = usePlatform()
  const { template, status, edit, rename, reset, remove, flush } = useTemplateEditor(templateId ?? '')

  const [selection, setSelection] = useState<Selection>(null)
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Confirming>(null)
  const [isUsing, setIsUsing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

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
  // A selection whose group or note has since been deleted falls back to the workspace.
  const selectedGroup = selection?.kind === 'group' ? (content.groups.find((g) => g.key === selection.key) ?? null) : null
  const selectedNote = selection?.kind === 'note' ? findNote(content, selection.key) : null
  // Mobile shows one group at a time, like the board's tabs.
  const activeGroup = content.groups.find((g) => g.key === activeGroupKey) ?? content.groups[0] ?? null

  /** Changes what the settings show. Like the real editor, a note only exists once it
   * has a title, so leaving an untitled one discards it. */
  function select(next: Selection) {
    if (selectedNote && selectedNote.note.title.trim() === '' && !(next?.kind === 'note' && next.key === selectedNote.note.key)) {
      const key = selectedNote.note.key
      edit((c) => deleteNote(c, key))
    }
    setSelection(next)
  }

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
    setSelection({ kind: 'note', key })
  }

  async function handleExport() {
    setFileError(null)
    try {
      await exportTemplate(current)
    } catch {
      setFileError(`Couldn't export "${current.name}". Try again.`)
    }
  }

  /** Replaces this template's groups and sample notes with a file's (an updated version,
   * e.g. one an AI assistant edited). The template keeps its name and its place. */
  async function handleReplace() {
    setFileError(null)
    const parsed = await pickTemplateFile()
    if (parsed === null) return
    if (parsed === 'invalid') {
      setFileError(NOT_A_TEMPLATE_MESSAGE)
      return
    }
    setConfirming({ kind: 'replace', content: parsed.content })
  }

  function handleConfirm() {
    if (confirming?.kind === 'reset') {
      setSelection(null)
      reset()
    }
    if (confirming?.kind === 'replace') {
      const replacement = confirming.content
      setSelection(null)
      edit(() => replacement)
    }
    if (confirming?.kind === 'delete') remove().then(() => navigate('/apps/templates'))
    if (confirming?.kind === 'delete-group') {
      const key = confirming.groupKey
      edit((c) => deleteGroup(c, key))
      setSelection(null)
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
        : confirming?.kind === 'replace'
          ? {
              title: 'Replace template',
              message: `Replace everything in "${template.name}" with the file's ${confirming.content.groups.length} groups and ${countNotes(confirming.content)} sample notes? The template keeps its name.`,
              confirmLabel: 'Replace',
            }
          : {
            title: 'Delete group',
            message: 'Delete this group and its sample notes from the template?',
            confirmLabel: 'Delete',
          }

  const workspaceSettings = (
    <TemplateWorkspaceSettings
      content={content}
      isBuiltin={isBuiltin}
      showGroups={!isNative}
      onSelectGroup={(key) => select({ kind: 'group', key })}
      onAddGroup={(name) => edit((c) => addGroup(c, name))}
      onDeleteGroup={(groupKey) => setConfirming({ kind: 'delete-group', groupKey })}
      onCompletedGroupChange={(key) => edit((c) => setCompletedGroup(c, key))}
      onDangerAction={() => setConfirming({ kind: isBuiltin ? 'reset' : 'delete' })}
    />
  )

  const groupSettings = selectedGroup && (
    <TemplateGroupSettings
      content={content}
      group={selectedGroup}
      onPatch={(patch) => edit((c) => patchGroup(c, selectedGroup.key, patch))}
      onMove={(direction) => edit((c) => moveGroup(c, selectedGroup.key, direction))}
      onAddNote={() => handleAddNote(selectedGroup.key)}
      onDelete={() => setConfirming({ kind: 'delete-group', groupKey: selectedGroup.key })}
    />
  )

  const noteSettings = selectedNote && (
    <TemplateNoteSettings
      // Remount per note, so a newly added one focuses its title.
      key={selectedNote.note.key}
      note={selectedNote.note}
      group={selectedNote.group}
      onPatch={(patch) => edit((c) => patchNote(c, selectedNote.note.key, patch))}
      onDelete={() => {
        edit((c) => deleteNote(c, selectedNote.note.key))
        setSelection(null)
      }}
    />
  )

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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExport} className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}>
            <AnimatedIcon icon={ExportIcon} size={16} />
            Export
          </button>
          <button type="button" onClick={handleReplace} className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}>
            <AnimatedIcon icon={ImportIcon} size={16} />
            Replace from file
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
          {!isNative && <SidebarToggle storageKey={TEMPLATE_SETTINGS_PANEL_KEY} label="settings" />}
        </div>
      </TemplatesToolbar>

      <FormError message={fileError} />

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
                  onSelectNote={(key) => select({ kind: 'note', key })}
                />
              </div>
              <button type="button" onClick={() => handleAddNote(activeGroup.key)} className={`${CHIP} font-medium text-ink`}>
                <AnimatedIcon icon={PlusIcon} size={20} />
                Add sample note
              </button>
              <button
                type="button"
                onClick={() => select({ kind: 'group', key: activeGroup.key })}
                className={`${CHIP} font-medium text-ink`}
              >
                <AnimatedIcon icon={SettingsIcon} size={20} />
                <span className="min-w-0 truncate">{activeGroup.name} settings</span>
              </button>
            </>
          )}
          <NewTemplateGroupInput onAdd={(name) => edit((c) => addGroup(c, name))} />
          {workspaceSettings}

          {/* Mobile has no sidebar: group and note settings open in a full-page modal. */}
          <Modal
            isOpen={selectedGroup !== null || selectedNote !== null}
            onClose={() => select(null)}
            title={selectedNote ? 'Sample note' : undefined}
            variant="full-page"
            overlayClassName={DIALOG_OVERLAY}
            panelClassName={DIALOG_SHADOW}
          >
            {/* p-1: room for the chips' offset shadows inside Modal's scroll box. */}
            <div className="p-1">{noteSettings || groupSettings}</div>
          </Modal>
        </div>
      ) : (
        <BoardWithSettings
          openRequest={selection?.key ?? null}
          board={
            <TemplateBoard
              className="h-full"
              content={content}
              selectedGroupKey={selectedGroup?.key ?? null}
              selectedNoteKey={selectedNote?.note.key ?? null}
              onClearSelection={() => select(null)}
              onOpenGroup={(key) => select({ kind: 'group', key })}
              onAddNote={handleAddNote}
              onSelectNote={(key) => select({ kind: 'note', key })}
              onAddGroup={(name) => edit((c) => addGroup(c, name))}
            />
          }
        >
          {noteSettings ? (
            <>
              <SettingsPanelHeader onClose={() => select(null)}>Sample note</SettingsPanelHeader>
              {noteSettings}
            </>
          ) : groupSettings ? (
            <>
              <SettingsPanelHeader onClose={() => select(null)}>Group</SettingsPanelHeader>
              {groupSettings}
            </>
          ) : (
            <>
              <SettingsPanelHeader>Workspace settings</SettingsPanelHeader>
              {workspaceSettings}
            </>
          )}
        </BoardWithSettings>
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
