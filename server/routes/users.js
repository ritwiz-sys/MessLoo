const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')
const { createClerkClient } = require('@clerk/backend')

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
})

const SUPER_ADMINS = [] // add super-admin emails here when needed

router.post('/sync', verifyAuth, async (req, res) => {
  const { name, college_id, block_id } = req.body
  const clerk_user_id = req.userId

  // ── VIT-AP email gate ──────────────────────────────────────────────────────
  // Check ALL email addresses on the account, not just the primary — users may
  // have signed up with a personal email first and added their VIT-AP email later.
  let email
  try {
    const clerkUser = await clerkClient.users.getUser(clerk_user_id)
    const vitapEmail = clerkUser.emailAddresses.find(
      (e) =>
        e.emailAddress.endsWith('@vitap.ac.in') ||
        e.emailAddress.endsWith('@vitapstudent.ac.in')
    )
    if (!vitapEmail) {
      return res.status(403).json({
        error: 'Only VIT-AP students can access MessLoo. Please add your @vitap.ac.in email to your account.',
      })
    }
    email = vitapEmail.emailAddress
  } catch (err) {
    return res.status(500).json({ error: 'Could not verify email with Clerk.' })
  }

  // ── Role assignment ────────────────────────────────────────────────────────
  let role = 'student'
  if (SUPER_ADMINS.includes(email)) {
    role = 'super_admin'
  }

  // ── Check if user already exists ───────────────────────────────────────────
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerk_user_id)
    .single()

  if (existingUser) {
    return res.json({ data: existingUser })
  }

  // ── Create new user ────────────────────────────────────────────────────────
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      clerk_user_id,
      name,
      college_id,
      block_id,
      role,
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