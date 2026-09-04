const { HfInference } = require('@huggingface/inference')
const Groq = require('groq-sdk')
const supabase = require('../supabase')

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

async function getEmbedding(text) {
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  })
  if (Array.isArray(result[0])) {
    const len = result[0].length
    const mean = new Array(len).fill(0)
    for (const vec of result) {
      for (let i = 0; i < len; i++) mean[i] += vec[i]
    }
    return mean.map(v => v / result.length)
  }
  return result
}

async function queryRAG(question, blockCategory, messType = null, conversationHistory = []) {
  // Step 1 — embed the question
  const questionVector = await getEmbedding(question)

  // Step 2 — vector search (increased to 8 chunks)
  const rpcParams = {
    query_embedding: questionVector,
    match_count: 8,
    filter_block_category: blockCategory,
  }
  if (messType) {
    rpcParams.filter_mess_type = messType
  }

  const { data: results, error } = await supabase.rpc('match_menus', rpcParams)

  if (error) {
    console.error('pgvector search error:', error.message)
    throw error
  }

  const relevantChunks = results.map(r => r.content)
  const context = relevantChunks.join('\n\n')

  // Step 3 — build system prompt with today's date
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  const messTypeLabel = messType ? ` (${messType} mess)` : ''
  const systemPrompt = `You are a helpful mess assistant for VIT Amaravati hostel students.
Today's date is ${today}.
The student is in the ${blockCategory} block${messTypeLabel}.

Answer questions based ONLY on the mess menu context provided below.
Do NOT use any outside knowledge about food or menus.
If the answer is not in the context, say exactly: "I don't have menu information for that date or meal."
Be concise, friendly, and accurate. Never make up dish names or dates.

Menu Context:
${context}`

  // Step 4 — build messages array
  const historyMessages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: question },
  ]

  // Step 5 — call Groq with lower temperature
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.1,
  })

  return {
    answer: completion.choices[0].message.content,
    sources: relevantChunks,
  }
}

module.exports = { queryRAG }