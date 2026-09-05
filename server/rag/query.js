const supabase = require('../supabase')
const { HfInference } = require('@huggingface/inference')
const OpenAI = require('openai')

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function getEmbedding(text) {
  const result = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
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
    match_count: 8,
    filter_block_category: blockCategory,
  }
  if (messType) rpcParams.filter_mess_type = messType

  const { data: results, error } = await supabase.rpc('match_menus', rpcParams)
  if (error) throw error

  const relevantChunks = results.map(r => r.content)
  const context = relevantChunks.join('\n\n')

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  const messTypeLabel = messType ? ` (${messType} mess)` : ''
  const systemPrompt = `You are a helpful mess assistant for VIT Amaravati hostel students.
Today is ${today}.
The student is in the ${blockCategory} block${messTypeLabel}.
Answer ONLY from the menu context below. Never make up dishes or dates.
If not in context, say: "I don't have menu information for that."

Menu Context:
${context}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.1,
    max_tokens: 512,
  })

  return {
    answer: completion.choices[0].message.content,
    sources: relevantChunks,
  }
}

module.exports = { queryRAG }