const express = require('express')
const router = express.Router()

// POST /auth/admin  { password } → { token }
router.post('/admin', (req, res) => {
  const { password } = req.body
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return res.status(500).json({ error: 'Admin password not configured.' })
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Wrong password.' })
  }
  // Token IS the password — simple, no JWT dep needed
  res.json({ token: expected })
})

module.exports = router
