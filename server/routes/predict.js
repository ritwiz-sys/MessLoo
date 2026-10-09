const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const { predictTodayAllMeals } = require('../rag/predict')
const supabase = require('../supabase')

const ADMIN_ROLES = ['super_admin', 'company_admin']
const BLOCKED_FROM_TODAY = ['student', 'faculty', 'kitchen_staff']
const BLOCKED_FROM_WASTAGE = ['student', 'faculty']

async function getFullUser(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, block_id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  if (error || !data) return null
  return data
}

// GET /predict/today — admin-only attendance + wastage predictions
router.get('/today', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (BLOCKED_FROM_TODAY.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { block_category } = req.query

  try {
    if (block_category) {
      const predictions = await predictTodayAllMeals(block_category)
      return res.json({ data: predictions })
    }

    // No filter — return both MH and LH in parallel
    const [mh, lh] = await Promise.all([
      predictTodayAllMeals('MH'),
      predictTodayAllMeals('LH'),
    ])

    res.json({ data: { MH: mh, LH: lh } })
  } catch (error) {
    console.error('Prediction error:', error.message)
    res.status(500).json({ error: 'Failed to generate predictions' })
  }
})

// GET /predict/wastage — historical wastage summary (kitchen_staff + admins)
router.get('/wastage', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (BLOCKED_FROM_WASTAGE.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { date, block_id } = req.query

  let query = supabase
    .from('daily_wastage_summary')
    .select('*, blocks(name, block_category)')
    .order('summary_date', { ascending: false })

  if (date) query = query.eq('summary_date', date)

  if (user.role === 'kitchen_staff' || user.role === 'company_admin') {
    // Scoped to their own block regardless of query param
    query = query.eq('block_id', user.block_id)
  } else if (user.role === 'super_admin' && block_id) {
    // Super admin may optionally filter by a specific block
    query = query.eq('block_id', block_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  res.json({ data })
})

module.exports = router
