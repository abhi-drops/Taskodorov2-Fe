import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { SyncStatusBadge } from '../components/SyncStatusBadge'
import { GroupColumn } from '../components/GroupColumn'
import { BoardTabStrip } from '../components/BoardTabStrip'
import { GroupDropTargets } from '../components/GroupDropTargets'
import { Icon } from '../components/ui/Icon'
import { FloatingAddButton } from '../components/ui/FloatingAddButton'
import { TapeBackdrop } from '../components/ui/TapeBackdrop'
import { SWATCH_CLASSES } from '../components/ui/swatchColors'
import { usePlatform } from '../lib/platform/usePlatform'
import { useBoard } from '../common_logics/useBoard'
import { useAddButtonSettings } from '../common_logics/useAddButtonSettings'
import { useTransitionReady } from '../lib/motion/pageTransitions'
import { useScrolled } from '../lib/layout/useScrolled'
import { useBlurredPeek } from '../lib/layout/useBlurredPeek'
import { useIsHeaderBackdropSuppressed } from '../lib/layout/headerBackdropSuppression'
import { useBoardDnd, groupChipDragId } from '../common_logics/useBoardDnd'
import { resolveNoteColor } from '../lib/notes/resolveNoteColor'
import { onShowGroupRequest } from '../lib/onboarding/boardFocus'
import searchIcon from '../assets/search.png'
import { ThemeToggle } from '../components/ThemeToggle'

/**
 * Mobile only: pins whichever of `BoardTabStrip`/`GroupDropTargets` is passed as
 * `children` to the top of the viewport once scrolled past, with the same "tape
 * material" backdrop (`TapeBackdrop`/`useBlurredPeek`) the desktop header uses — see
 * `docs/style-guide.md`'s "Scrolled header: the 'tape material'" section. Unlike
 * `AppShell`'s own header, this is `position: sticky`, not `fixed`: it already sits in
 * normal page flow below the (non-sticky) workspace/icons row, so sticky reserves its
 * own layout slot for free — no spacer/`ResizeObserver` needed the way `fixed` requires.
 * `notesRef` should point at the `GroupColumn` notes immediately below it in the DOM;
 * its measured document-Y position is what `useBlurredPeek` blurs/tracks as "what's
 * really behind the strip."
 */
function StickyGroupTabs({ children: tabs, notesRef }: { children: ReactNode; notesRef: RefObject<HTMLElement | null> }) {
  const scrolled = useScrolled()
  // See `lib/layout/headerBackdropSuppression.ts`: without this, something like
  // `WorkspaceSwitcher`'s dropdown overlay (a translucent full-screen dim) would stack
  // directly on top of this strip's own wash/grain/sheen, compounding into a far more
  // washed-out look than either intends alone.
  const suppressed = useIsHeaderBackdropSuppressed()
  const backdropActive = scrolled && !suppressed
  const [notesOffsetTop, setNotesOffsetTop] = useState(0)
  const peekRef = useBlurredPeek(notesRef, notesOffsetTop, backdropActive)

  useEffect(() => {
    const measure = () => {
      if (notesRef.current) setNotesOffsetTop(notesRef.current.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [notesRef])

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 py-3">
      {/* Stronger than TapeBackdrop's desktop-tuned defaults — a note card's flat,
          solid-color body (unlike the board's mixed, saturated columns) blurs into a
          much more even wash and can still read as legible text underneath at the
          default strength. */}
      <TapeBackdrop active={backdropActive} peekRef={peekRef} blurPx={36} washOpacity={0.6} />
      <div className="relative">{tabs}</div>
    </div>
  )
}

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
  const { isMobile } = usePlatform()
  const board = useBoard()
  useTransitionReady(board.loaded)
  const { dynamic: dynamicAddButton, position: addButtonPosition } = useAddButtonSettings()
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    notesForGroup,
    hiddenCountForGroup,
    isGroupRevealed,
    toggleGroupRevealed,
    refresh,
  } = board
  const { sensors, activeDragItem, handleDragStart, handleDragEnd, handleDragCancel } = useBoardDnd(board, {
    // Mobile only: after dragging a note into a different group via GroupDropTargets,
    // switch the tab strip to that group so the user sees where it landed — on web all
    // columns are visible at once, so there's no "active" column to update.
    onNoteMovedToGroup: isMobile ? setActiveGroupId : undefined,
  })
  // Mobile only: the onboarding tour switches tab to where a note it had the user check
  // ended up (see `lib/onboarding/boardFocus.ts`).
  useEffect(() => {
    if (!isMobile) return
    return onShowGroupRequest(setActiveGroupId)
  }, [isMobile, setActiveGroupId])
  const activeGroup = groups.find((g) => g.id === activeGroupId)
  const notesRef = useRef<HTMLDivElement>(null)

  const workspaceSwitcher = <WorkspaceSwitcher />
  const searchLink = (
    <Link
      to="/search"
      viewTransition
      aria-label="Search"
      className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink"
    >
      {/* The PNG is ink-coloured, so it is inverted to white to show on the ink circle. */}
      <Icon src={searchIcon} alt="" size={15} className="[filter:brightness(0)_invert(1)] transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none" />
    </Link>
  )
  const headerEnd = (
    <div className="flex items-center gap-3">
      <SyncStatusBadge />
      {/* Desktop only: on mobile the theme lives in Settings. */}
      {!isMobile && <ThemeToggle />}
      {searchLink}
    </div>
  )

  return (
    <AppShell
      headerStart={!isMobile ? workspaceSwitcher : undefined}
      headerEnd={!isMobile ? headerEnd : undefined}
    >
      {isMobile && (
        <div className="flex items-center justify-between gap-4">
          {workspaceSwitcher}
          {headerEnd}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-body">No groups yet — add one from Settings.</p>
          <Link to="/settings" className="font-medium text-accent-purple">
            Go to Settings
          </Link>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          {isMobile ? (
            <div className="mt-6 flex flex-1 flex-col gap-4">
              <StickyGroupTabs notesRef={notesRef}>
                {activeDragItem?.type === 'note' ? (
                  <GroupDropTargets groups={groups.filter((g) => g.id !== activeGroupId)} />
                ) : (
                  <BoardTabStrip groups={groups} activeGroupId={activeGroupId ?? ''} onSelect={setActiveGroupId} />
                )}
              </StickyGroupTabs>
              {activeGroup && (
                <div ref={notesRef}>
                  <GroupColumn
                    group={activeGroup}
                    notes={notesForGroup(activeGroup)}
                    onChange={refresh}
                    showHeader={false}
                    hiddenCount={hiddenCountForGroup(activeGroup)}
                    showingHidden={isGroupRevealed(activeGroup)}
                    onToggleHidden={() => toggleGroupRevealed(activeGroup)}
                  />
                </div>
              )}
              {/* Mobile's quick-add — adds to the active tab's group, same target the
                  web per-column "+" uses. Hidden mid-drag so it can't overlap the drop
                  targets, and until its settings load so it never flashes at the
                  wrong height. */}
              {activeDragItem?.type !== 'note' && addButtonPosition !== null && (
                <FloatingAddButton
                  to={activeGroupId ? `/notes/new?group=${activeGroupId}` : '/notes/new'}
                  position={addButtonPosition}
                  dynamic={dynamicAddButton === true}
                />
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
                    <GroupColumn
                      group={group}
                      notes={notesForGroup(group)}
                      onChange={refresh}
                      hiddenCount={hiddenCountForGroup(group)}
                      showingHidden={isGroupRevealed(group)}
                      onToggleHidden={() => toggleGroupRevealed(group)}
                    />
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
