const express = require('express')
const router = express.Router()
const Groq = require('groq-sdk')
const verifyAuth = require('../middleware/auth')
const { queryRAG, pickModel } = require('../rag/query')
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
    console.log('[FALLBACK] Using basic menu echo for question:', question)
    
    // Fetch menu without filters (just to get the table data)
    const { data: fallbackMenus } = await supabase
      .from('menus')
      .select('date, meal_type, items')
      .order('date')
    
    const fallbackContext = fallbackMenus && fallbackMenus.length > 0
      ? fallbackMenus.map(m => `${m.date} ${m.meal_type}: ${m.items}`).join('\n')
      : 'No menu data available.'
    
    // Ask Groq to just format and return the menu
    const fallbackSystemPrompt = `
You are a friendly mess assistant for VIT-AP.
The student asked: "${question}"

Here is the raw menu data; format it nicely for the student.
If the question is about something else, say so but still show the menu.

Menu Data:
${fallbackContext}`
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const fallbackModel = await pickModel(groq)
    const fallbackResult = await groq.chat.completions.create({
      model: fallbackModel,
      messages: [
        { role: 'system', content: fallbackSystemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
      max_tokens: 800,
    })
    
    res.json({
      answer: fallbackResult.choices[0].message.content,
      sources: []
    })
  }
})

module.exports = router
