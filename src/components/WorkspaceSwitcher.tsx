import { useEffect, useRef } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { useWorkspaceSwitcher } from '../common_logics/useWorkspaceSwitcher'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

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
    renamingId,
    renameValue,
    setRenameValue,
    startRename,
    cancelRename,
    confirmRename,
    confirmingDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useWorkspaceSwitcher()

  const containerRef = useRef<HTMLDivElement>(null)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  useEffect(() => {
    if (isNative || !isOpen) return

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNative, isOpen, close])

  function renderConfirmDelete() {
    const target = workspaces.find((w) => w.id === confirmingDeleteId)
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-slate-700">Delete "{target?.name}" and everything in it?</p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={cancelDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </div>
    )
  }

  function renderList() {
    return (
      <div className="flex flex-col gap-2">
        {workspaces.map((ws) => (
          <div key={ws.id} className="flex items-center gap-2 rounded-card border border-slate-200 px-3 py-2">
            {renamingId === ws.id ? (
              <>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  className="flex-1 rounded-card border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent-purple"
                />
                <button type="button" onClick={confirmRename} className="text-sm font-medium text-accent-purple">
                  Save
                </button>
                <button type="button" onClick={cancelRename} className="text-sm text-slate-500">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSwitch(ws.id)}
                  className={`flex-1 text-left text-sm ${
                    ws.id === activeWorkspaceId ? 'font-semibold text-nav-dark' : 'text-slate-700'
                  }`}
                >
                  {ws.name}
                </button>
                <button
                  type="button"
                  onClick={() => startRename(ws.id, ws.name)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Rename
                </button>
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => requestDelete(ws.id)}
                    className="text-xs text-sticky-coral hover:opacity-80"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        <div className="mt-2 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            placeholder="New workspace"
            className="flex-1 rounded-card border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple"
          />
          <Button variant="secondary" onClick={handleCreate}>
            Add
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className="flex items-center gap-1.5 font-display text-2xl font-bold text-nav-dark"
      >
        {activeWorkspace?.name ?? 'Workspace'}
        <svg className="h-3 w-3" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {!isNative && isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-card bg-white p-4 text-left shadow-lg">
          {confirmingDeleteId ? renderConfirmDelete() : renderList()}
        </div>
      )}

      {isNative && (
        <Modal isOpen={isOpen} onClose={close} title="Workspaces" variant="bottom-sheet">
          {confirmingDeleteId ? renderConfirmDelete() : renderList()}
        </Modal>
      )}
    </div>
  )
}
