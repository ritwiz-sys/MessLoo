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

// Check if the current (signed-in) user has marked attendance for a specific menu
router.get('/', verifyAuth, async (req, res) => {
  const { menu_id } = req.query

  if (!menu_id) {
    return res.status(400).json({ error: 'menu_id is required' })
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
    .from('attendance')
    .select('*')
    .eq('user_id', user.id)
    .eq('menu_id', menu_id)
    .single()

  if (error) {
    // No row found (or any other lookup issue) just means "not marked yet"
    return res.json({ data: null })
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

  // Pull the raw attendance rows first — no nested embed here, since the
  // attendance -> users -> blocks embed chain trips PostgREST's relationship
  // disambiguation (it was erroring with "column blocks_2.block_name does
  // not exist"). We instead join manually in JS below, which sidesteps that
  // entirely and is easier to reason about.
  const { data, error } = await supabase
    .from('attendance')
    .select('user_id, ate, rating')
    .eq('menu_id', menu_id)

  if (error) {
    console.log('Attendance summary query error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  // Calculate overall summary
  const total = data.length
  const eating = data.filter(a => a.ate === true).length
  const skipping = data.filter(a => a.ate === false).length
  const ratings = data.filter(a => a.rating !== null).map(a => a.rating)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  // Look up each responder's block_id, then the block details, as two flat
  // queries — avoids the nested-embed ambiguity entirely.
  const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))]

  let usersById = {}
  if (userIds.length) {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, block_id')
      .in('id', userIds)

    if (usersError) {
      console.log('Attendance summary users lookup error:', usersError.message)
      return res.status(500).json({ error: usersError.message })
    }
    usersById = Object.fromEntries((usersData || []).map(u => [u.id, u]))
  }

  const blockIds = [...new Set(Object.values(usersById).map(u => u.block_id).filter(Boolean))]

  let blocksById = {}
  if (blockIds.length) {
    const { data: blocksData, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .in('id', blockIds)

    if (blocksError) {
      console.log('Attendance summary blocks lookup error:', blocksError.message)
      return res.status(500).json({ error: blocksError.message })
    }
    blocksById = Object.fromEntries((blocksData || []).map(b => [b.id, b]))
  }

  // Group the same rows by specific block (MH1, MH2, LH1, ...)
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
        total: 0,
        eating: 0,
        skipping: 0,
        ratings: [],
      }
    }
    const entry = byBlockMap[blockId]
    entry.total += 1
    if (row.ate === true) entry.eating += 1
    if (row.ate === false) entry.skipping += 1
    if (row.rating !== null && row.rating !== undefined) entry.ratings.push(row.rating)
  }

  const byBlock = Object.values(byBlockMap).map(({ ratings: blockRatings, ...rest }) => ({
    ...rest,
    avg_rating: blockRatings.length
      ? (blockRatings.reduce((a, b) => a + b, 0) / blockRatings.length).toFixed(1)
      : null,
  }))

  res.json({
    data: {
      total_responses: total,
      eating,
      skipping,
      avg_rating: avgRating,
      by_block: byBlock,
    }
  })
})

module.exports = router