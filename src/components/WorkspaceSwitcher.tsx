import { useEffect, useRef, useState } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { useWorkspaceSwitcher } from '../common_logics/useWorkspaceSwitcher'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { ChevronDownIcon, CloseIcon, EditIcon } from './ui/icons'
import { Modal } from './ui/Modal'
import { ConfirmDialog } from './ui/ConfirmDialog'

const CHIP = 'flex items-center gap-3 rounded-card border-[3px] border-ink bg-white px-3 py-2.5 shadow-card'

/** A frosted white dim (not the default dark `Modal` overlay) plus a deeper offset
 * shadow than the app's usual `shadow-card` — this switcher is meant to feel like it
 * lifts further off the page than an ordinary chip, on both platforms. */
const SWITCHER_OVERLAY = 'bg-white/60 backdrop-blur-sm'
const SWITCHER_SHADOW = 'shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)]'

export function WorkspaceSwitcher() {
  const { isNative } = usePlatform()
  const {
    workspaces,
    activeWorkspaceId,
    isOpen,
    open,
    close,
    newName,
    setNewName,
    handleCreate,
    handleSwitch,
    updateName,
    confirmingDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useWorkspaceSwitcher()

  const containerRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const deleteTarget = workspaces.find((w) => w.id === confirmingDeleteId)

  function closeAll() {
    setEditingId(null)
    close()
  }

  useEffect(() => {
    if (isNative || !isOpen) return

    function handlePointerDown(e: PointerEvent) {
      // The delete ConfirmDialog renders through Modal's createPortal(..., document.body),
      // so its buttons live outside containerRef — without this guard, clicking them
      // registers as an "outside" pointerdown and closes everything (including the
      // dialog itself) before the click event can fire onConfirm.
      if (confirmingDeleteId) return
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditingId(null)
        close()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEditingId(null)
        close()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNative, isOpen, close, confirmingDeleteId])

  function renderList() {
    return (
      <div className="flex flex-col gap-2">
        {workspaces.map((ws) =>
          editingId === ws.id ? (
            <div key={ws.id} className={CHIP}>
              <input
                autoFocus
                defaultValue={ws.name}
                onBlur={(e) => {
                  updateName(ws.id, e.target.value)
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                aria-label={`Rename ${ws.name}`}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none"
              />
            </div>
          ) : (
            <div key={ws.id} className={CHIP}>
              <button
                type="button"
                onClick={() => handleSwitch(ws.id)}
                className={`min-w-0 flex-1 truncate text-left text-sm ${
                  ws.id === activeWorkspaceId ? 'font-bold text-ink' : 'font-medium text-slate-700'
                }`}
              >
                {ws.name}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(ws.id)}
                aria-label={`Rename ${ws.name}`}
                className="shrink-0 text-ink hover:opacity-70"
              >
                <AnimatedIcon icon={EditIcon} size={16} />
              </button>
              {workspaces.length > 1 && (
                <button
                  type="button"
                  onClick={() => requestDelete(ws.id)}
                  aria-label={`Delete ${ws.name}`}
                  className="shrink-0 text-ink hover:opacity-70"
                >
                  <AnimatedIcon icon={CloseIcon} size={16} />
                </button>
              )}
            </div>
          ),
        )}

        <div className={`${CHIP} justify-between`}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            placeholder="+ New workspace"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink/50"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="shrink-0 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
          >
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => (isOpen ? closeAll() : open())}
        className={`relative flex items-center gap-1.5 font-display text-2xl font-bold text-nav-dark ${
          isOpen ? 'z-[60]' : ''
        }`}
      >
        {activeWorkspace?.name ?? 'Workspace'}
        <AnimatedIcon icon={ChevronDownIcon} size={14} />
      </button>

      {!isNative && isOpen && (
        <>
          <div className={`fixed inset-0 z-40 ${SWITCHER_OVERLAY}`} onClick={closeAll} />
          <div
            className={`absolute left-0 top-full z-50 mt-2 w-80 border border-neutral-300 bg-surface p-4 text-left ${SWITCHER_SHADOW}`}
          >
            {renderList()}
          </div>
        </>
      )}

      {isNative && (
        <Modal
          isOpen={isOpen}
          onClose={closeAll}
          title="Workspaces"
          variant="bottom-sheet"
          overlayClassName={SWITCHER_OVERLAY}
          panelClassName={SWITCHER_SHADOW}
        >
          {renderList()}
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmingDeleteId !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete workspace"
        message={`Delete "${deleteTarget?.name}" and everything in it? This can't be undone.`}
      />
    </div>
  )
}
