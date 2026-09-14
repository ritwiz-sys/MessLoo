const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')
const getOrCreateUser = require('../helpers/getOrCreateUser')

// Student marks attendance
router.post('/', verifyAuth, async (req, res) => {
  const { menu_id, ate, rating, feedback } = req.body

  const user = await getOrCreateUser(req.userId, req.block)
  if (!user) return res.status(404).json({ error: 'User not found' })

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

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: user.id,
      menu_id,
      ate,
      rating: rating || null,
      feedback: feedback || null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// Check if the current user has marked attendance for a specific menu
router.get('/', verifyAuth, async (req, res) => {
  const { menu_id } = req.query
  if (!menu_id) return res.status(400).json({ error: 'menu_id is required' })

  const user = await getOrCreateUser(req.userId, req.block)
  if (!user) return res.json({ data: null })

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', user.id)
    .eq('menu_id', menu_id)
    .single()

  if (error) return res.json({ data: null })
  res.json({ data })
})

// Admin gets attendance summary for a specific menu
router.get('/summary', verifyAuth, async (req, res) => {
  const { menu_id } = req.query

  const { data, error } = await supabase
    .from('attendance')
    .select('user_id, ate, rating')
    .eq('menu_id', menu_id)

  if (error) return res.status(500).json({ error: error.message })

  const total = data.length
  const eating = data.filter(a => a.ate === true).length
  const skipping = data.filter(a => a.ate === false).length
  const ratings = data.filter(a => a.rating !== null).map(a => a.rating)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))]
  let usersById = {}
  if (userIds.length) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, block_id')
      .in('id', userIds)
    usersById = Object.fromEntries((usersData || []).map(u => [u.id, u]))
  }

  const blockIds = [...new Set(Object.values(usersById).map(u => u.block_id).filter(Boolean))]
  let blocksById = {}
  if (blockIds.length) {
    const { data: blocksData } = await supabase
      .from('blocks')
      .select('*')
      .in('id', blockIds)
    blocksById = Object.fromEntries((blocksData || []).map(b => [b.id, b]))
  }

  const byBlockMap = {}
  for (const row of data) {
    const userRecord = usersById[row.user_id]
    const block = userRecord?.block_id ? blocksById[userRecord.block_id] : null
    const blockId = block?.id ?? 'unknown'
    if (!byBlockMap[blockId]) {
      byBlockMap[blockId] = {
        block_id: block?.id ?? null,
        block_name: block?.name || 'Unknown block',
        catering_company: block?.catering_company || null,
        total: 0, eating: 0, skipping: 0, ratings: [],
      }
    }
    const entry = byBlockMap[blockId]
    entry.total += 1
    if (row.ate === true) entry.eating += 1
    if (row.ate === false) entry.skipping += 1
    if (row.rating != null) entry.ratings.push(row.rating)
  }

  const byBlock = Object.values(byBlockMap).map(({ ratings: r, ...rest }) => ({
    ...rest,
    avg_rating: r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1) : null,
  }))

  res.json({ data: { total_responses: total, eating, skipping, avg_rating: avgRating, by_block: byBlock } })
})

module.exports = router
