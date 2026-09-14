const supabase = require('../supabase')

/**
 * Look up the Supabase internal user ID for a given external user ID
 * (our localStorage-generated UUID stored as clerk_user_id).
 * Auto-creates a student user row if one doesn't exist yet.
 *
 * @param {string} externalUserId  - req.userId (x-user-id header)
 * @param {string} blockCategory   - req.block  (x-block header, 'MH' or 'LH')
 * @returns {Promise<{id, role, block_id}|null>}
 */
async function getOrCreateUser(externalUserId, blockCategory = 'MH') {
  if (!externalUserId || externalUserId === 'anonymous') return null

  // Try to find existing user
  const { data: existing } = await supabase
    .from('users')
    .select('id, role, block_id')
    .eq('clerk_user_id', externalUserId)
    .single()

  if (existing) return existing

  // Strip trailing digits so 'MH3' → 'MH', 'LH1' → 'LH'
  const category = (blockCategory || 'MH').replace(/\d+$/, '') || 'MH'

  // Auto-create: pick any block for this category to assign as home block
  const { data: block } = await supabase
    .from('blocks')
    .select('id')
    .eq('block_category', category)
    .limit(1)
    .single()

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      clerk_user_id: externalUserId,
      role: 'student',
      block_id: block?.id || null,
    })
    .select('id, role, block_id')
    .single()

  if (error) {
    console.error('getOrCreateUser insert error:', error.message)
    return null
  }
  return newUser
}

module.exports = getOrCreateUser
