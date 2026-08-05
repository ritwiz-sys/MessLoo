const { createClerkClient } = require('@clerk/backend')

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
})

const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    const { verifyToken } = require('@clerk/backend')
    
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    req.userId = payload.sub
    next()

  } catch (error) {
    console.log('Token error:', error.message)
    return res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = verifyAuth