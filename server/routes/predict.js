const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const { predictTodayAllMeals } = require('../rag/predict')
const supabase = require('../supabase')

router.get('/today', verifyAuth, async (req, res) => {
  const { block_category } = req.query

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', req.userId)
    .single()

  if (!user || user.role === 'student') {
    return res.status(403).json({ error: 'Not authorized' })
  }

  try {
    if (block_category) {
      const predictions = await predictTodayAllMeals(block_category)
      return res.json({ data: predictions })
    }

    // If no block_category specified, return both MH and LH
    const [mh, lh] = await Promise.all([
      predictTodayAllMeals('MH'),
      predictTodayAllMeals('LH')
    ])

    res.json({ data: { MH: mh, LH: lh } })
  } catch (error) {
    console.error('Prediction error:', error.message)
    res.status(500).json({ error: 'Failed to generate predictions' })
  }
})

module.exports = router