import type { ReactNode } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { useAndroidBackButton } from '../lib/platform/useAndroidBackButton'
import { TopNav } from './ui/TopNav'
import { BottomNav } from './ui/BottomNav'
import { ExitToast } from './ui/ExitToast'

interface AppShellProps {
  children: ReactNode
  headerStart?: ReactNode
  headerEnd?: ReactNode
}

export function AppShell({ children, headerStart, headerEnd }: AppShellProps) {
  const { isNative } = usePlatform()
  const { showExitToast } = useAndroidBackButton()

  return (
    <div className="bg-grid flex min-h-svh flex-col">
      {!isNative && (
        <div className="flex items-center gap-4 p-6">
          <div className="flex flex-1 justify-start">{headerStart}</div>
          <TopNav />
          <div className="flex flex-1 justify-end">{headerEnd}</div>
        </div>
      )}
      <div className={`flex flex-1 flex-col p-6 ${isNative ? 'pb-24' : ''}`}>{children}</div>
      {isNative && <BottomNav />}
      {showExitToast && <ExitToast />}
    </div>
  )
}
