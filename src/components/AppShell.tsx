import type { ReactNode } from 'react'
import { usePlatform } from '../lib/platform/usePlatform'
import { TopNav } from './ui/TopNav'
import { BottomNav } from './ui/BottomNav'

interface AppShellProps {
  children: ReactNode
  headerStart?: ReactNode
  headerEnd?: ReactNode
  addNoteGroupId?: string | null
}

export function AppShell({ children, headerStart, headerEnd, addNoteGroupId }: AppShellProps) {
  const { isNative } = usePlatform()

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
      {isNative && <BottomNav addNoteGroupId={addNoteGroupId} />}
    </div>
  )
}
