const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')

// Student marks attendance
router.post('/', verifyAuth, async (req, res) => {
  const { menu_id, ate, rating, feedback } = req.body
  const clerk_user_id = req.userId

  // Get user from Supabase
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerk_user_id)
    .single()

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Only students can mark attendance
  if (user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can mark attendance' })
  }

  // Check if already marked
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', user.id)
    .eq('menu_id', menu_id)
    .single()

  if (existing) {
    return res.status(400).json({ error: 'Attendance already marked for this meal' })
  }

  // Insert attendance
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: user.id,
      menu_id,
      ate,
      rating: rating || null,
      feedback: feedback || null
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

// Admin gets attendance summary for a specific menu
router.get('/summary', verifyAuth, async (req, res) => {
  const { menu_id } = req.query

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
    .from('attendance')
    .select('ate, rating')
    .eq('menu_id', menu_id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Calculate summary
  const total = data.length
  const eating = data.filter(a => a.ate === true).length
  const skipping = data.filter(a => a.ate === false).length
  const ratings = data.filter(a => a.rating !== null).map(a => a.rating)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  res.json({
    data: {
      total_responses: total,
      eating,
      skipping,
      avg_rating: avgRating
    }
  })
})

module.exports = router