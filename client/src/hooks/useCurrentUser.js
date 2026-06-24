import { useCallback, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { api } from '../lib/api'

/**
 * Ensures the signed-in Clerk user exists in our DB, then loads the
 * authoritative profile (role + block) from GET /users/me.
 */
export function useCurrentUser() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()

      // Make sure a row exists for this Clerk user. New sign-ups default
      // to the student role; admins are provisioned directly in the DB.
      await api.syncUser(token, {
        name: clerkUser?.fullName || clerkUser?.username || 'Student',
        college_id: clerkUser?.publicMetadata?.college_id || null,
        block_id: clerkUser?.publicMetadata?.block_id || null,
        role: 'student',
      })

      const me = await api.getMe(token)
      setProfile(me?.data || null)
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken, clerkUser])

  useEffect(() => {
    if (authLoaded) {
      load()
    }
  }, [authLoaded, load])

  // Lets a student pick (or change) which block they belong to once they
  // know it — used by BlockPicker when blockCategory comes back empty.
  const updateBlock = useCallback(
    async (blockId) => {
      const token = await getToken()
      const res = await api.updateMe(token, { block_id: blockId })
      setProfile(res?.data || null)
      return res?.data
    },
    [getToken],
  )

  const role = profile?.role || null
  // Category (MH / LH) — used to filter menus, which are posted per category.
  const blockCategory = profile?.blocks?.block_category || profile?.blocks?.category || profile?.block_category || null
  // Specific block (e.g. "MH2") — this is the actual block_id relationship,
  // it's just never been surfaced in the UI before now.
  const blockName = profile?.blocks?.name || profile?.blocks?.block_name || profile?.blocks?.label || null
  // The catering company is derived purely from which block they picked —
  // there's no separate selection step for it.
  const cateringCompany = profile?.blocks?.catering_company || null

  return {
    loading: !authLoaded || loading,
    error,
    profile,
    role,
    blockCategory,
    blockName,
    cateringCompany,
    refetch: load,
    updateBlock,
  }
}
