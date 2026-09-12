import { useDroppable } from '@dnd-kit/core'
import { groupDropId } from '../common_logics/useBoardDnd'
import type { Group } from '../types/group'

/**
 * Mobile-only: HomePage.tsx swaps this in for BoardTabStrip while a note is being
 * dragged. Large "drop here" tiles for every group other than the active one, using
 * dnd-kit's normal useDroppable collision detection — no custom hit-testing or timers,
 * unlike the dwell-on-tab approach this replaced (see docs/feat-groups.md). Bigger,
 * more forgiving touch targets than a small tab.
 */
export function GroupDropTargets({ groups }: { groups: Group[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Move note to group">
      {groups.map((group) => (
        <GroupDropTarget key={group.id} group={group} />
      ))}
    </div>
  )
}

function GroupDropTarget({ group }: { group: Group }) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupDropId(group.id),
    data: { type: 'group', groupId: group.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-12 shrink-0 items-center justify-center rounded-card border-[3px] border-ink px-4 py-3 text-center text-sm font-medium shadow-card transition ${
        isOver ? 'scale-105 bg-accent-purple text-white' : 'bg-slate-200 text-ink'
      }`}
    >
      {group.name}
    </div>
  )
}
