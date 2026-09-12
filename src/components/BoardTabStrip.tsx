import { useRef, useState } from 'react'
import { useDndMonitor, type DragMoveEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { groupChipDragId, type DragGroupChipData, type DragNoteData } from '../common_logics/useBoardDnd'
import type { Group } from '../types/group'

const DWELL_MS = 550

interface BoardTabStripProps {
  groups: Group[]
  activeGroupId: string
  onSelect: (groupId: string) => void
}

/**
 * Mobile-only board tab strip — visually like `components/ui/Tabs` (which stays
 * generic/untouched, SearchPage also uses it) but each tab doubles as: a draggable
 * sortable chip for reordering groups, and a "dwell" drop target — hover a dragged note
 * over a non-active tab for DWELL_MS to switch to it, revealing that group's list to
 * drop into. See docs/feat-groups.md and the board drag-and-drop plan for why mobile
 * needs this instead of side-by-side columns.
 */
export function BoardTabStrip({ groups, activeGroupId, onSelect }: BoardTabStripProps) {
  const tabNodes = useRef(new Map<string, HTMLElement>())
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dwellTargetRef = useRef<string | null>(null)
  const [dwellTargetId, setDwellTargetId] = useState<string | null>(null)

  function clearDwell() {
    if (dwellTimer.current) clearTimeout(dwellTimer.current)
    dwellTimer.current = null
    dwellTargetRef.current = null
    setDwellTargetId(null)
  }

  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      const data = event.active.data.current as DragNoteData | DragGroupChipData | undefined
      if (data?.type !== 'note') return

      const rect = event.active.rect.current.translated
      if (!rect) return
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      let hoveredId: string | null = null
      for (const [groupId, node] of tabNodes.current) {
        const tabRect = node.getBoundingClientRect()
        if (cx >= tabRect.left && cx <= tabRect.right && cy >= tabRect.top && cy <= tabRect.bottom) {
          hoveredId = groupId
          break
        }
      }

      if (!hoveredId || hoveredId === activeGroupId) {
        clearDwell()
        return
      }
      if (hoveredId === dwellTargetRef.current) return

      clearDwell()
      dwellTargetRef.current = hoveredId
      setDwellTargetId(hoveredId)
      dwellTimer.current = setTimeout(() => {
        onSelect(hoveredId!)
        clearDwell()
      }, DWELL_MS)
    },
    onDragEnd: clearDwell,
    onDragCancel: clearDwell,
  })

  return (
    <SortableContext items={groups.map((g) => groupChipDragId(g.id))} strategy={horizontalListSortingStrategy}>
      <div className="flex flex-wrap gap-2" role="tablist">
        {groups.map((group) => (
          <BoardTab
            key={group.id}
            group={group}
            isActive={group.id === activeGroupId}
            isDwelling={group.id === dwellTargetId}
            onSelect={onSelect}
            registerNode={(el) => {
              if (el) tabNodes.current.set(group.id, el)
              else tabNodes.current.delete(group.id)
            }}
          />
        ))}
      </div>
    </SortableContext>
  )
}

function BoardTab({
  group,
  isActive,
  isDwelling,
  onSelect,
  registerNode,
}: {
  group: Group
  isActive: boolean
  isDwelling: boolean
  onSelect: (groupId: string) => void
  registerNode: (el: HTMLElement | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupChipDragId(group.id),
    data: { type: 'group-chip', groupId: group.id } satisfies DragGroupChipData,
  })

  return (
    <button
      type="button"
      ref={(node) => {
        setNodeRef(node)
        registerNode(node)
      }}
      onClick={() => onSelect(group.id)}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={isActive}
      className={`rounded-card px-3.5 py-1.5 text-sm font-medium transition ${
        isActive
          ? 'bg-nav-dark text-white'
          : isDwelling
            ? 'scale-105 border-2 border-accent-purple bg-accent-purple/10 text-slate-900'
            : 'border border-slate-200 bg-white text-slate-700'
      }`}
    >
      {group.name}
    </button>
  )
}
