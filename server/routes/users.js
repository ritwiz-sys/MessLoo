const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')

router.post('/sync', verifyAuth, async (req, res) => {
  const { name, college_id, block_id, role } = req.body
  const clerk_user_id = req.userId

  // Check if user already exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerk_user_id)
    .single()

  if (existingUser) {
    return res.json({ data: existingUser })
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      clerk_user_id,
      name,
      college_id,
      block_id,
      role: role || 'student'
    })
    .select()
    .single()

  if (createError) {
    return res.status(500).json({ error: createError.message })
  }

  res.json({ data: newUser })
})

// Student updates their own profile — primarily used so they can pick
// which MH/LH block they belong to after signing up.
router.patch('/me', verifyAuth, async (req, res) => {
  const { block_id, college_id, name } = req.body

  const updates = {}
  if (block_id !== undefined) updates.block_id = block_id
  if (college_id !== undefined) updates.college_id = college_id
  if (name !== undefined) updates.name = name

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', req.userId)
    .single()

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('*, blocks(*)')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

router.get('/me', verifyAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, blocks(*)')
    .eq('clerk_user_id', req.userId)
    .single()

  if (error) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ data })
})

module.exports = router