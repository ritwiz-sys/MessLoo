const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const verifyAuth = require('../middleware/auth')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data })
})

router.get('/protected-test', verifyAuth, async (req, res) => {
  res.json({ 
    message: 'You are authenticated',
    clerkUserId: req.userId 
  })
})

module.exports = router