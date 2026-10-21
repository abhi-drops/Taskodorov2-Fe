import { useContext } from 'react'
import { SyncContext } from './syncContext'

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
