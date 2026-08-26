import type { ReactNode } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { TopNav } from './ui/TopNav'
import { BottomNav } from './ui/BottomNav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { isNative } = usePlatform()

  return (
    <div className="bg-grid flex min-h-svh flex-col">
      {!isNative && (
        <div className="flex justify-center p-6">
          <TopNav />
        </div>
      )}
      <div className={`flex flex-1 flex-col p-6 ${isNative ? 'pb-24' : ''}`}>{children}</div>
      {isNative && <BottomNav />}
    </div>
  )
}
