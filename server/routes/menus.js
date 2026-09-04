const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')

// Get menu for a specific date and block category
router.get('/', verifyAuth, async (req, res) => {
  const { date, block_category, block_id } = req.query

  if (!date || !block_category) {
    return res.status(400).json({ error: 'date and block_category are required' })
  }

  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('block_category', block_category)
    .eq('date', date)
    .eq('is_special', false)
    .order('meal_type')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

// Add a new menu item — admin only
router.post('/', verifyAuth, async (req, res) => {
  const { block_category, block_id, date, meal_type, items, is_special } = req.body

  // Check if user is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', req.userId)
    .single()

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (user.role === 'student') {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { data, error } = await supabase
    .from('menus')
    .insert({
      block_category,
      block_id: block_id || null,
      date,
      meal_type,
      items,
      is_special: is_special || false
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

module.exports = router