import { useState } from 'react'
import { createGroup } from '../lib/db/groups'

export function useGroupForm(workspaceId: string | null, onCreated: () => void) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || !workspaceId) return

    setIsSubmitting(true)
    try {
      await createGroup({ workspaceId, name: trimmed })
      setName('')
      onCreated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return { name, setName, handleCreate, isSubmitting }
}
