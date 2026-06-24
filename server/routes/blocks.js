const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')

const ADMIN_ROLES = ['super_admin', 'company_admin']

// Looks up the signed-in (Clerk-authenticated) user's role, so the
// create/update/delete routes below can be locked to admins only.
async function getRole(clerkUserId) {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', clerkUserId)
    .single()
  return data?.role || null
}

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

router.get('/protected-test', verifyAuth, async (req, res) => {
  res.json({
    message: 'You are authenticated',
    clerkUserId: req.userId
  })
})

// Admin creates a new block (e.g. "MH8") with its category and catering company.
router.post('/', verifyAuth, async (req, res) => {
  const role = await getRole(req.userId)
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { block_name, block_category, catering_company } = req.body

  if (!block_name || !block_category) {
    return res.status(400).json({ error: 'block_name and block_category are required' })
  }

  const { data, error } = await supabase
    .from('blocks')
    .insert({
      block_name,
      block_category,
      catering_company: catering_company || null,
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

// Admin edits an existing block's name, category, or catering company.
router.patch('/:id', verifyAuth, async (req, res) => {
  const role = await getRole(req.userId)
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { block_name, block_category, catering_company } = req.body
  const updates = {}
  if (block_name !== undefined) updates.block_name = block_name
  if (block_category !== undefined) updates.block_category = block_category
  if (catering_company !== undefined) updates.catering_company = catering_company

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  const { data, error } = await supabase
    .from('blocks')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

// Admin removes a block entirely.
router.delete('/:id', verifyAuth, async (req, res) => {
  const role = await getRole(req.userId)
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data: { id: req.params.id } })
})

module.exports = router