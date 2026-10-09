const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const supabase = require('../supabase')

const KITCHEN_ROLES = ['kitchen_staff', 'company_admin', 'super_admin']
const ADMIN_ROLES = ['company_admin', 'super_admin']

async function getFullUser(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, block_id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  if (error || !data) return null
  return data
}

// Aggregates all completed drum logs for a block+date+meal and upserts
// the result into daily_wastage_summary.
async function updateDailyWastageSummary(blockId, mealDate, mealType) {
  const { data: logs, error } = await supabase
    .from('drum_logs')
    .select('total_prepared_kg, wastage_kg')
    .eq('block_id', blockId)
    .eq('meal_date', mealDate)
    .eq('meal_type', mealType)
    .eq('status', 'completed')

  if (error) {
    console.error('updateDailyWastageSummary fetch error:', error.message)
    return
  }

  const totalPreparedKg = logs.reduce((sum, l) => sum + (l.total_prepared_kg || 0), 0)
  const totalWastageKg = logs.reduce((sum, l) => sum + (l.wastage_kg || 0), 0)
  const wastagePercent = totalPreparedKg > 0
    ? parseFloat(((totalWastageKg / totalPreparedKg) * 100).toFixed(2))
    : 0

  const { error: upsertError } = await supabase
    .from('daily_wastage_summary')
    .upsert(
      {
        block_id: blockId,
        summary_date: mealDate,
        meal_type: mealType,
        total_prepared_kg: parseFloat(totalPreparedKg.toFixed(2)),
        total_wastage_kg: parseFloat(totalWastageKg.toFixed(2)),
        wastage_percent: wastagePercent,
        total_dishes: logs.length,
      },
      { onConflict: 'summary_date,block_id,meal_type' }
    )

  if (upsertError) {
    console.error('updateDailyWastageSummary upsert error:', upsertError.message)
  }
}

// POST /drum-logs — kitchen staff logs drums before a meal
router.post('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (!KITCHEN_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { menu_id, dish_name, drums_prepared, meal_date, meal_type } = req.body

  if (!dish_name || drums_prepared == null || !meal_date || !meal_type) {
    return res.status(400).json({
      error: 'dish_name, drums_prepared, meal_date, and meal_type are required',
    })
  }

  if (typeof drums_prepared !== 'number' || drums_prepared <= 0) {
    return res.status(400).json({ error: 'drums_prepared must be a positive number' })
  }

  // Fetch this block's drum capacity from drum_settings
  const { data: setting, error: settingError } = await supabase
    .from('drum_settings')
    .select('drum_capacity_kg')
    .eq('block_id', user.block_id)
    .single()

  if (settingError || !setting) {
    return res.status(400).json({ error: 'Drum settings not found for this block' })
  }

  const drumCapacityKg = setting.drum_capacity_kg
  const totalPreparedKg = parseFloat((drums_prepared * drumCapacityKg).toFixed(2))

  const { data, error } = await supabase
    .from('drum_logs')
    .insert({
      menu_id: menu_id || null,
      dish_name,
      drums_prepared,
      drum_capacity_kg: drumCapacityKg,
      total_prepared_kg: totalPreparedKg,
      meal_date,
      meal_type,
      block_id: user.block_id,
      status: 'prepared',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ data })
})

// PATCH /drum-logs/:id/complete — log leftover after meal ends
router.patch('/:id/complete', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (!KITCHEN_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { leftover_kg } = req.body
  if (leftover_kg == null || typeof leftover_kg !== 'number' || leftover_kg < 0) {
    return res.status(400).json({ error: 'leftover_kg must be a non-negative number' })
  }

  // Fetch the existing log
  const { data: log, error: fetchError } = await supabase
    .from('drum_logs')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (fetchError || !log) return res.status(404).json({ error: 'Drum log not found' })

  // Non-super-admin may only complete logs for their own block
  if (user.role !== 'super_admin' && log.block_id !== user.block_id) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  if (log.status === 'completed') {
    return res.status(400).json({ error: 'Drum log is already completed' })
  }

  const wastageKg = parseFloat(Math.max(0, log.total_prepared_kg - leftover_kg).toFixed(2))
  const wastagePercent = log.total_prepared_kg > 0
    ? parseFloat(((wastageKg / log.total_prepared_kg) * 100).toFixed(2))
    : 0

  const { data, error } = await supabase
    .from('drum_logs')
    .update({
      leftover_kg: parseFloat(leftover_kg.toFixed(2)),
      wastage_kg: wastageKg,
      wastage_percent: wastagePercent,
      status: 'completed',
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Roll up into daily_wastage_summary — fire-and-forget
  updateDailyWastageSummary(log.block_id, log.meal_date, log.meal_type).catch(err =>
    console.error('Background wastage summary update failed:', err.message)
  )

  res.json({ data })
})

// GET /drum-logs — role-based fetch
router.get('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (!KITCHEN_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { meal_date, meal_type, block_id } = req.query

  if (user.role === 'kitchen_staff' || user.role === 'company_admin') {
    let query = supabase
      .from('drum_logs')
      .select('*')
      .eq('block_id', user.block_id)
      .order('created_at', { ascending: false })

    if (meal_date) query = query.eq('meal_date', meal_date)
    if (meal_type) query = query.eq('meal_type', meal_type)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  }

  if (user.role === 'super_admin') {
    let query = supabase
      .from('drum_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (meal_date) query = query.eq('meal_date', meal_date)
    if (meal_type) query = query.eq('meal_type', meal_type)
    if (block_id) query = query.eq('block_id', block_id)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  }

  return res.status(403).json({ error: 'Not authorized' })
})

module.exports = router
