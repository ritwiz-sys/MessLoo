const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const { queryRAG } = require('../rag/query')
const supabase = require('../supabase')

router.post('/', verifyAuth, async (req, res) => {
  const { question } = req.body

  if (!question || question.trim() === '') {
    return res.status(400).json({ error: 'Question is required' })
  }

  // Get user's block category and mess type
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*, blocks(*)')
    .eq('clerk_user_id', req.userId)
    .single()

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const blockCategory = user.blocks?.block_category || 'MH'
  const messType = user.blocks?.mess_type || null

  try {
    const result = await queryRAG(question, blockCategory, messType, [])
    res.json(result)
  } catch (error) {
    console.error('RAG error:', error.message)
    res.status(500).json({ error: 'Failed to process question' })
  }
})

module.exports = router
