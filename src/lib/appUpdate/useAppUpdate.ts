import { useContext } from 'react'
import { AppUpdateContext } from './appUpdateContext'

export function useAppUpdate() {
  const ctx = useContext(AppUpdateContext)
  if (!ctx) throw new Error('useAppUpdate must be used within AppUpdateProvider')
  return ctx
}
