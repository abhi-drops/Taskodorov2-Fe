import { useContext } from 'react'
import { WhatsNewContext } from './whatsNewContext'

export function useWhatsNew() {
  const ctx = useContext(WhatsNewContext)
  if (!ctx) throw new Error('useWhatsNew must be used within WhatsNewProvider')
  return ctx
}
