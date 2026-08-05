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
  const questionVector = await getEmbedding(question)

  const rpcParams = {
    query_embedding: questionVector,
    match_count: 5,
    filter_block_category: blockCategory,
  }
  if (messType) {
    rpcParams.filter_mess_type = messType
  }

  // DEBUG
  console.log('RAG search params:', { blockCategory, messType })

  const { data: results, error } = await supabase.rpc('match_menus', rpcParams)

  // DEBUG
  console.log('RAG results count:', results?.length)
  console.log('RAG error:', error?.message)

  if (error) {
    console.error('pgvector search error:', error.message)
    throw error
  }

  const relevantChunks = results.map(r => r.content)
  const context = relevantChunks.join('\n\n')

  const todayISO = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  const todayFull = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const messTypeLabel = messType ? ` (${messType})` : ''
  const systemPrompt = `You are a friendly mess assistant for VIT-AP (VIT Amaravati) students.
Today's date is ${todayFull} (${todayISO}).
The student is in the ${blockCategory} block${messTypeLabel}.

Use the menu data below to answer the student's question. Rules:
- When the student asks about "today", use the entry matching today's date (${todayISO}).
- If today's exact menu is not in the data, say so clearly and mention the closest upcoming day's menu you DO have.
- NEVER say you don't have information if relevant menu entries are present in the context — read the dates carefully.
- List out dish names in a readable way (e.g. "Dinner includes Roti, Dal, Paneer...").
- Be brief, warm, and helpful. Do not invent dishes or dates.

Menu Context:
${context}`

  const historyMessages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: question },
  ]

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3,
  })

  return {
    answer: completion.choices[0].message.content,
    sources: relevantChunks,
  }
}

module.exports = { queryRAG }