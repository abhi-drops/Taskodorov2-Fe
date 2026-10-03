import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { updatePanelLayout, usePanelLayout } from '../../lib/storage/panelLayout'

/**
 * A desktop sidebar that can be **collapsed** (from a `SidebarToggle` in the page's
 * toolbar, sharing state through `lib/storage/panelLayout.ts`) and **resized by
 * dragging** its inner edge, with both remembered per `storageKey`. It is also **capped
 * to the screen height** and stays in view as the page scrolls (`sticky`), scrolling its
 * own content when that content is taller. Used for the Apps list
 * (`SidebarPanelLayout`) and the Diary's day-details sidebar.
 *
 * - **Collapsing fully removes it**: the width animates to exactly 0, and the gap to its
 *   neighbour (`gap`, owned by this panel as a margin, so parents use no flex gap
 *   next to it) animates away with it. Nothing is left behind: no padding sliver, no
 *   border line, no empty gap.
 * - The inner panel keeps its own width and is clipped while animating, so content
 *   never re-wraps mid-collapse. A right-side panel stays anchored to its right edge.
 *   The animation is off while dragging, so resizing tracks the pointer exactly.
 * - The resize edge is a proper `separator`: ←/→ resize by 16px, and a double-click
 *   resets to the default width.
 * - A collapsed panel is `inert`, so its hidden links can't be tabbed into.
 */

interface SidePanelProps {
  side: 'left' | 'right'
  storageKey: string
  /** Names the panel in the resize handle's label, e.g. "Apps". */
  label: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  /** Space between this panel and the content beside it, in px. */
  gap?: number
  /** Classes for the visible panel box (border, background, padding, layout). */
  panelClassName?: string
  /**
   * When this changes to a non-null value, a collapsed panel expands, e.g. the Diary
   * passes the selected note id so picking a card always reveals its details.
   */
  openRequest?: string | null
  /**
   * Height cap for the panel (it scrolls inside beyond it): px, or any CSS length.
   * Prefer a measured value (`useFillViewportHeight`), as the Diary does, over a guessed
   * screen offset. The default suits a short panel right under the top nav.
   */
  maxHeight?: number | string
  children: ReactNode
}

const KEY_STEP = 16
/** Room for `shadow-card`'s 1px/3px offset, which the clip box would otherwise cut. */
const SHADOW_ROOM = 4

export function SidePanel({
  side,
  storageKey,
  label,
  defaultWidth,
  minWidth,
  maxWidth,
  gap = 32,
  panelClassName = '',
  openRequest = null,
  maxHeight = 'calc(100svh - 8rem)',
  children,
}: SidePanelProps) {
  const clamp = (w: number) => Math.min(maxWidth, Math.max(minWidth, Math.round(w)))
  const layout = usePanelLayout(storageKey)
  const width = clamp(layout.width ?? defaultWidth)
  const collapsed = layout.collapsed

  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startWidth: number; lastWidth: number } | null>(null)
  const panelId = useId()

  // Reveal on a new open request (e.g. a different note selected).
  useEffect(() => {
    if (openRequest !== null) updatePanelLayout(storageKey, { collapsed: false })
  }, [openRequest, storageKey])

  // During a drag, keep the resize cursor and block text selection everywhere, even
  // once the pointer has left the thin handle.
  useEffect(() => {
    if (!dragging) return
    const { cursor, userSelect } = document.body.style
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = cursor
      document.body.style.userSelect = userSelect
    }
  }, [dragging])

  // Dragging the inner edge outward grows the panel: rightward for a left panel,
  // leftward for a right one.
  const grow = side === 'left' ? 1 : -1

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startWidth: width, lastWidth: width }
    setDragging(true)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const next = clamp(drag.current.startWidth + (e.clientX - drag.current.startX) * grow)
    if (next === drag.current.lastWidth) return
    drag.current.lastWidth = next
    updatePanelLayout(storageKey, { width: next }, { persist: false })
  }

  function endDrag() {
    if (!drag.current) return
    updatePanelLayout(storageKey, { width: drag.current.lastWidth })
    drag.current = null
    setDragging(false)
  }

  function onHandleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!direction) return
    e.preventDefault()
    updatePanelLayout(storageKey, { width: clamp(width + direction * grow * KEY_STEP) })
  }

  const animate = dragging ? '' : 'transition-[width,margin] duration-200 ease-out'

  return (
    <div
      className={`sticky top-6 shrink-0 self-start ${animate}`}
      // The gap belongs to the panel so it closes along with it.
      style={side === 'left' ? { marginRight: collapsed ? 0 : gap } : { marginLeft: collapsed ? 0 : gap }}
    >
      {/* Clip box: exactly 0 wide when collapsed (no padding), so nothing peeks out. */}
      <div
        id={panelId}
        inert={collapsed}
        className={`flex overflow-hidden ${side === 'right' ? 'justify-end' : ''} ${animate}`}
        style={{
          width: collapsed ? 0 : width + SHADOW_ROOM,
          paddingRight: collapsed ? 0 : SHADOW_ROOM,
          paddingBottom: SHADOW_ROOM,
        }}
      >
        <div
          className={`shrink-0 overflow-y-auto overscroll-contain ${panelClassName}`}
          style={{ width, maxHeight }}
        >
          {children}
        </div>
      </div>

      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} sidebar`}
          aria-controls={panelId}
          aria-valuenow={width}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onHandleKeyDown}
          onDoubleClick={() => updatePanelLayout(storageKey, { width: clamp(defaultWidth) })}
          title="Drag to resize · double-click to reset"
          className={`group absolute bottom-1 top-0 z-10 flex w-3 cursor-col-resize touch-none justify-center focus-visible:outline-none ${
            side === 'left' ? '-right-2' : '-left-2'
          }`}
        >
          <span
            className={`h-full w-[3px] transition-colors group-hover:bg-ink/40 group-focus-visible:bg-accent-purple ${
              dragging ? 'bg-ink/60' : 'bg-transparent'
            }`}
          />
        </div>
      )}
    </div>
  )
}
