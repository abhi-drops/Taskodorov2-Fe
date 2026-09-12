import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { groupChipDragId, type DragGroupChipData } from '../common_logics/useBoardDnd'
import type { Group } from '../types/group'

interface BoardTabStripProps {
  groups: Group[]
  activeGroupId: string
  onSelect: (groupId: string) => void
}

/**
 * Mobile-only board tab strip — visually like `components/ui/Tabs` (which stays
 * generic/untouched, SearchPage also uses it) but each tab is also a draggable sortable
 * chip for reordering groups (long-press + drag). Cross-group note moves are handled
 * separately by `GroupDropTargets`, which HomePage.tsx swaps in for this strip while a
 * note is being dragged — see docs/feat-groups.md for why: a small tab is too fussy a
 * touch target to double as a drop zone.
 */
export function BoardTabStrip({ groups, activeGroupId, onSelect }: BoardTabStripProps) {
  return (
    <SortableContext items={groups.map((g) => groupChipDragId(g.id))} strategy={horizontalListSortingStrategy}>
      <div className="flex flex-wrap gap-2" role="tablist">
        {groups.map((group) => (
          <BoardTab key={group.id} group={group} isActive={group.id === activeGroupId} onSelect={onSelect} />
        ))}
      </div>
    </SortableContext>
  )
}

function BoardTab({
  group,
  isActive,
  onSelect,
}: {
  group: Group
  isActive: boolean
  onSelect: (groupId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupChipDragId(group.id),
    data: { type: 'group-chip', groupId: group.id } satisfies DragGroupChipData,
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={() => onSelect(group.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={isActive}
      className={`rounded-card px-3.5 py-1.5 text-sm font-medium transition ${
        isActive ? 'bg-nav-dark text-white' : 'border border-slate-200 bg-white text-slate-700'
      }`}
    >
      {group.name}
    </button>
  )
}
