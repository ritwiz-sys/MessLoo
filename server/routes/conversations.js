const express = require('express')
const router = express.Router()
const verifyAuth = require('../middleware/auth')
const { queryRAG } = require('../rag/query')
const supabase = require('../supabase')

// Resolve clerk_user_id → full user row with nested block data
async function getFullUser(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, blocks(*)')
    .eq('clerk_user_id', clerkUserId)
    .single()
  if (error || !data) return null
  return data
}

// GET /conversations — list all conversations for the current user
router.get('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /conversations — create a new conversation
router.post('/', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { title } = req.body

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title || 'New Conversation',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ data })
})

// GET /conversations/:id/messages — get all messages in a conversation
router.get('/:id/messages', verifyAuth, async (req, res) => {
  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Verify ownership
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', user.id)
    .single()

  if (convError || !conv) return res.status(404).json({ error: 'Conversation not found' })

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /conversations/:id/messages — send a message and get an AI response
router.post('/:id/messages', verifyAuth, async (req, res) => {
  const { question } = req.body
  if (!question || question.trim() === '') {
    return res.status(400).json({ error: 'question is required' })
  }

  const user = await getFullUser(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Verify ownership
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', user.id)
    .single()

  if (convError || !conv) return res.status(404).json({ error: 'Conversation not found' })

  const blockCategory = user.blocks?.block_category || 'MH'
  const messType = user.blocks?.mess_type || null

  // Fetch last 10 messages for conversation context (oldest-first for the LLM)
  const { data: historyRows, error: histError } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (histError) return res.status(500).json({ error: histError.message })

  const conversationHistory = (historyRows || []).reverse()

  // Save user message first
  const { error: userMsgError } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: req.params.id,
      role: 'user',
      content: question.trim(),
    })

  if (userMsgError) return res.status(500).json({ error: userMsgError.message })

  // Run RAG pipeline
  let ragResult
  try {
    ragResult = await queryRAG(question.trim(), blockCategory, messType, conversationHistory)
  } catch (err) {
    console.error('RAG error:', err.message)
    return res.status(500).json({ error: 'Failed to process question' })
  }

  // Save assistant response
  const { error: asstMsgError } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: req.params.id,
      role: 'assistant',
      content: ragResult.answer,
    })

  if (asstMsgError) return res.status(500).json({ error: asstMsgError.message })

  // Bump conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', req.params.id)

  res.json({ answer: ragResult.answer, sources: ragResult.sources })
})

module.exports = router
