/**
 * Simple auth middleware — no Clerk, no JWT.
 * Students pass x-user-id (a UUID from localStorage) and x-block (MH|LH).
 * No verification: open access for students, just identity tracking.
 */
const simpleAuth = (req, res, next) => {
  req.userId = req.headers['x-user-id'] || 'anonymous'
  req.block  = req.headers['x-block']   || 'MH'
  next()
}

module.exports = simpleAuth
