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

  const role      = session?.role  || null
  // blockName is the full stored value e.g. "MH3", "LH1" — used for display
  const blockName = session?.block || null
  // blockCategory strips trailing digits → "MH" / "LH" — used for API block_category filter
  const blockCategory = blockName ? blockName.replace(/\d+$/, '') : null

  return {
    loading: false,
    error: null,
    profile: session,
    role,
    blockCategory,
    blockName,
    cateringCompany: null,
    refetch: () => setLocalSession(getSession()),
    updateBlock,
  }
}
