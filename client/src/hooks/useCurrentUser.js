import { useState, useCallback } from 'react'
import { getSession, setSession } from '../lib/auth'

export function useCurrentUser() {
  const [session, setLocalSession] = useState(() => getSession())

  const updateBlock = useCallback((block) => {
    const s = getSession() || {}
    const updated = { ...s, block }
    setSession(updated)
    setLocalSession(updated)
  }, [])

  const role          = session?.role          || null
  const blockCategory = session?.block         || null

  return {
    loading: false,
    error: null,
    profile: session,
    role,
    blockCategory,
    blockName: blockCategory,
    cateringCompany: null,
    refetch: () => setLocalSession(getSession()),
    updateBlock,
  }
}
