const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const supabase = require('../supabase')

async function getSupabaseUserId(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  if (error || !data) return null
  return data.id
}

// GET /preferences — get current user's preferences
router.get('/', verifyAuth, async (req, res) => {
  const userId = await getSupabaseUserId(req.userId)
  if (!userId) return res.status(404).json({ error: 'User not found' })

  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // PGRST116 = no rows found — not an error, just no prefs set yet
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data: data || null })
})

// POST /preferences — create or update preferences (full upsert)
router.post('/', verifyAuth, async (req, res) => {
  const userId = await getSupabaseUserId(req.userId)
  if (!userId) return res.status(404).json({ error: 'User not found' })

  const {
    liked_dishes,
    disliked_dishes,
    dietary_restrictions,
    spice_level,
    avoid_ingredients,
  } = req.body

  const payload = { user_id: userId }
  if (liked_dishes !== undefined) payload.liked_dishes = liked_dishes
  if (disliked_dishes !== undefined) payload.disliked_dishes = disliked_dishes
  if (dietary_restrictions !== undefined) payload.dietary_restrictions = dietary_restrictions
  if (spice_level !== undefined) payload.spice_level = spice_level
  if (avoid_ingredients !== undefined) payload.avoid_ingredients = avoid_ingredients

  const { data, error } = await supabase
    .from('preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// PATCH /preferences/like — add a dish to liked_dishes
// (also removes from disliked_dishes to keep the two lists mutually exclusive)
router.patch('/like', verifyAuth, async (req, res) => {
  const { dish } = req.body
  if (!dish || dish.trim() === '') {
    return res.status(400).json({ error: 'dish is required' })
  }

  const userId = await getSupabaseUserId(req.userId)
  if (!userId) return res.status(404).json({ error: 'User not found' })

  const { data: current } = await supabase
    .from('preferences')
    .select('liked_dishes, disliked_dishes')
    .eq('user_id', userId)
    .single()

  const trimmed = dish.trim()
  const likedDishes = current?.liked_dishes || []
  const dislikedDishes = (current?.disliked_dishes || []).filter(d => d !== trimmed)

  if (!likedDishes.includes(trimmed)) {
    likedDishes.push(trimmed)
  }

  const { data, error } = await supabase
    .from('preferences')
    .upsert(
      { user_id: userId, liked_dishes: likedDishes, disliked_dishes: dislikedDishes },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// PATCH /preferences/dislike — add a dish to disliked_dishes
// (also removes from liked_dishes to keep the two lists mutually exclusive)
router.patch('/dislike', verifyAuth, async (req, res) => {
  const { dish } = req.body
  if (!dish || dish.trim() === '') {
    return res.status(400).json({ error: 'dish is required' })
  }

  const userId = await getSupabaseUserId(req.userId)
  if (!userId) return res.status(404).json({ error: 'User not found' })

  const { data: current } = await supabase
    .from('preferences')
    .select('liked_dishes, disliked_dishes')
    .eq('user_id', userId)
    .single()

  const trimmed = dish.trim()
  const dislikedDishes = current?.disliked_dishes || []
  const likedDishes = (current?.liked_dishes || []).filter(d => d !== trimmed)

  if (!dislikedDishes.includes(trimmed)) {
    dislikedDishes.push(trimmed)
  }

  const { data, error } = await supabase
    .from('preferences')
    .upsert(
      { user_id: userId, liked_dishes: likedDishes, disliked_dishes: dislikedDishes },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

module.exports = router
