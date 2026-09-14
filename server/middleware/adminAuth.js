/**
 * Admin auth middleware — checks Authorization: Bearer <ADMIN_PASSWORD>
 */
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return res.status(500).json({ error: 'Admin password not configured on server.' })
  if (!auth || auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Admin access required.' })
  }
  next()
}

module.exports = adminAuth
