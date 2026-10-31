import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { useAndroidBackButton } from '../lib/platform/useAndroidBackButton'
import { useScrolled } from '../lib/layout/useScrolled'
import { useBlurredPeek } from '../lib/layout/useBlurredPeek'
import { HeaderBackdropSuppressionContext } from '../lib/layout/headerBackdropSuppression'
import { TapeBackdrop } from './ui/TapeBackdrop'
import { TopNav } from './ui/TopNav'
import { BottomNav } from './ui/BottomNav'
import { ExitToast } from './ui/ExitToast'

interface AppShellProps {
  children: ReactNode
  headerStart?: ReactNode
  headerEnd?: ReactNode
}

export function AppShell({ children, headerStart, headerEnd }: AppShellProps) {
  const { isMobile } = usePlatform()
  const { showExitToast } = useAndroidBackButton()
  const scrolled = useScrolled()
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  // Owns the "is something already fully dimming the screen (e.g. WorkspaceSwitcher's
  // dropdown overlay) suppressing the tape backdrop" state — see
  // `lib/layout/headerBackdropSuppression.ts`. Without this, that overlay's own
  // translucent dim stacks directly on top of the header's own wash/grain/sheen
  // wherever they overlap, compounding into a far more washed-out look than either
  // intends alone.
  const [suppressCount, setSuppressCount] = useState(0)
  const adjustSuppressCount = useCallback((delta: 1 | -1) => setSuppressCount((n) => n + delta), [])
  const backdropActive = scrolled && suppressCount === 0

  // `contentOffsetTop={headerHeight}`: the spacer below pushes real content to start
  // exactly `headerHeight` down the document, so that's where its natural top sits —
  // see `useBlurredPeek`'s own docs for what this number means.
  const peekRef = useBlurredPeek(contentRef, headerHeight, backdropActive)

  // `position: fixed`, not `sticky` — `backdrop-filter` on a `sticky` element has
  // known rendering bugs across browser engines where the blurred backdrop doesn't
  // keep sampling scrolled content live (it can effectively freeze at whatever was
  // behind it when it first became stuck). `fixed` doesn't have that failure mode, and
  // it's moot anyway now that the blur comes from `useBlurredPeek` rather than
  // `backdrop-filter`. Since `fixed` removes the header from normal flow, this spacer
  // (measured via `ResizeObserver`, not a hardcoded height) reserves the space it used
  // to occupy so the board content below doesn't jump up underneath it.
  useEffect(() => {
    if (isMobile || !headerRef.current) return
    const el = headerRef.current
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setHeaderHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isMobile])

  return (
    <HeaderBackdropSuppressionContext.Provider value={{ count: suppressCount, adjust: adjustSuppressCount }}>
      <div className="bg-grid flex min-h-svh flex-col">
        {!isMobile && (
          <>
            <div ref={headerRef} className="fixed inset-x-0 top-0 z-30">
              <TapeBackdrop active={backdropActive} peekRef={peekRef} />
              <div className="relative flex items-center gap-4 p-6">
                <div className="flex flex-1 justify-start">{headerStart}</div>
                <TopNav />
                <div className="flex flex-1 justify-end">{headerEnd}</div>
              </div>
            </div>
            <div style={{ height: headerHeight }} />
          </>
        )}
        <div ref={contentRef} className={`flex flex-1 flex-col p-6 ${isMobile ? 'pb-24' : ''}`}>
          {children}
        </div>
        {isMobile && <BottomNav />}
        {showExitToast && <ExitToast />}
      </div>
    </HeaderBackdropSuppressionContext.Provider>
  )
}
