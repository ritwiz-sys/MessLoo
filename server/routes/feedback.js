const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const supabase = require('../supabase')

const ADMIN_ROLES = ['super_admin', 'company_admin']

async function getFullUser(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, block_id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  if (error || !data) return null
  return data
}

// POST /feedback — student/faculty submits feedback
router.post('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (user.role === 'kitchen_staff') {
    return res.status(403).json({ error: 'Kitchen staff cannot submit feedback' })
  }

  const { menu_id, meal_date, meal_type, category, description, severity } = req.body

  if (!meal_date || !meal_type || !category || !description) {
    return res.status(400).json({ error: 'meal_date, meal_type, category, and description are required' })
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      block_id: user.block_id || null,
      menu_id: menu_id || null,
      meal_date,
      meal_type,
      category,
      description,
      severity: severity || 'medium',
      status: 'open',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ data })
})

// GET /feedback — role-based fetch
router.get('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (user.role === 'kitchen_staff') {
    return res.status(403).json({ error: 'Not authorized' })
  }

  if (user.role === 'student' || user.role === 'faculty') {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  }

  if (user.role === 'company_admin') {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('block_id', user.block_id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  }

  if (user.role === 'super_admin') {
    const { status, block_id, severity } = req.query

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (block_id) query = query.eq('block_id', block_id)
    if (severity) query = query.eq('severity', severity)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  }

  return res.status(403).json({ error: 'Not authorized' })
})

// PATCH /feedback/:id — admin updates feedback status
router.patch('/:id', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (!ADMIN_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })

  const validStatuses = ['open', 'acknowledged', 'resolved']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
  }

  // company_admin may only update feedback for their own block
  if (user.role === 'company_admin') {
    const { data: existing, error: fetchError } = await supabase
      .from('feedback')
      .select('block_id')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !existing) return res.status(404).json({ error: 'Feedback not found' })
    if (existing.block_id !== user.block_id) return res.status(403).json({ error: 'Not authorized' })
  }

  const updates = { status }
  if (status === 'resolved') {
    updates.resolved_by = user.id
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('feedback')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

module.exports = router
