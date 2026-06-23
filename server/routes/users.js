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