import { Link } from 'react-router'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { GroupColumn } from '../components/GroupColumn'
import { BoardTabStrip } from '../components/BoardTabStrip'
import { GroupDropTargets } from '../components/GroupDropTargets'
import { Icon } from '../components/ui/Icon'
import { FloatingAddButton } from '../components/ui/FloatingAddButton'
import { SWATCH_CLASSES } from '../components/ui/swatchColors'
import { usePlatform } from '../lib/platform/usePlatform'
import { useBoard } from '../common_logics/useBoard'
import { useBoardDnd, groupChipDragId } from '../common_logics/useBoardDnd'
import { resolveNoteColor } from '../lib/notes/resolveNoteColor'
import searchIcon from '../assets/search.png'

/** Lightweight drag ghost — not the full interactive card, just enough to track the cursor. */
function DragGhost({ item, groups }: { item: NonNullable<ReturnType<typeof useBoardDnd>['activeDragItem']>; groups: ReturnType<typeof useBoard>['groups'] }) {
  if (item.type === 'group-chip') {
    return (
      <div className="inline-flex items-center rounded-card border-[3px] border-ink bg-slate-300 px-3 py-1 font-display text-sm font-medium text-ink shadow-card">
        {item.group.name}
      </div>
    )
  }
  const group = groups.find((g) => g.id === item.note.groupId)
  const color = group ? resolveNoteColor(item.note, group) : 'blue'
  return (
    <div className={`w-72 rounded-card p-4 shadow-card ${SWATCH_CLASSES[color]}`}>
      <p className="line-clamp-2 text-sm font-medium text-black">{item.note.title}</p>
    </div>
  )
}

export default function HomePage() {
  const { isNative } = usePlatform()
  const board = useBoard()
  const { groups, activeGroupId, setActiveGroupId, notesForGroup, refresh } = board
  const { sensors, activeDragItem, handleDragStart, handleDragEnd, handleDragCancel } = useBoardDnd(board, {
    // Mobile only: after dragging a note into a different group via GroupDropTargets,
    // switch the tab strip to that group so the user sees where it landed — on web all
    // columns are visible at once, so there's no "active" column to update.
    onNoteMovedToGroup: isNative ? setActiveGroupId : undefined,
  })
  const activeGroup = groups.find((g) => g.id === activeGroupId)

  const workspaceSwitcher = <WorkspaceSwitcher />
  const searchLink = (
    <Link to="/search" aria-label="Search">
      <Icon src={searchIcon} alt="" size={20} />
    </Link>
  )

  return (
    <AppShell
      headerStart={!isNative ? workspaceSwitcher : undefined}
      headerEnd={!isNative ? searchLink : undefined}
    >
      {isNative && (
        <div className="flex items-center justify-between gap-4">
          {workspaceSwitcher}
          {searchLink}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-slate-600">No groups yet — add one from Settings.</p>
          <Link to="/settings" className="font-medium text-accent-purple">
            Go to Settings
          </Link>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          {isNative ? (
            <div className="mt-6 flex flex-1 flex-col gap-4">
              {activeDragItem?.type === 'note' ? (
                <GroupDropTargets groups={groups.filter((g) => g.id !== activeGroupId)} />
              ) : (
                <BoardTabStrip groups={groups} activeGroupId={activeGroupId ?? ''} onSelect={setActiveGroupId} />
              )}
              {activeGroup && (
                <GroupColumn
                  group={activeGroup}
                  notes={notesForGroup(activeGroup)}
                  onChange={refresh}
                  showHeader={false}
                />
              )}
              {/* Mobile's quick-add — adds to the active tab's group, same target the
                  web per-column "+" uses. Hidden mid-drag so it can't overlap the drop
                  targets. */}
              {activeDragItem?.type !== 'note' && (
                <FloatingAddButton to={activeGroupId ? `/notes/new?group=${activeGroupId}` : '/notes/new'} />
              )}
            </div>
          ) : (
            <SortableContext
              items={groups.map((g) => groupChipDragId(g.id))}
              strategy={horizontalListSortingStrategy}
            >
              <div className="mt-6 flex flex-1 gap-10 overflow-x-auto">
                {groups.map((group) => (
                  <div key={group.id} className="w-[22rem] shrink-0 pl-5">
                    <GroupColumn group={group} notes={notesForGroup(group)} onChange={refresh} />
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
          <DragOverlay>{activeDragItem && <DragGhost item={activeDragItem} groups={groups} />}</DragOverlay>
        </DndContext>
      )}
    </AppShell>
  )
}
