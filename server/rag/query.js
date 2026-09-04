const supabase = require('../supabase')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function getEmbedding(text) {
  const { HfInference } = require('@huggingface/inference')
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
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
  // Step 1 — embed question
  const questionVector = await getEmbedding(question)

  // Step 2 — vector search
  const rpcParams = {
    query_embedding: questionVector,
    match_count: 8,
    filter_block_category: blockCategory,
  }
  if (messType) rpcParams.filter_mess_type = messType

  const { data: results, error } = await supabase.rpc('match_menus', rpcParams)

  if (error) {
    console.error('pgvector search error:', error.message)
    throw error
  }

  const relevantChunks = results.map(r => r.content)
  const context = relevantChunks.join('\n\n')

  // Step 3 — build system prompt
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  const messTypeLabel = messType ? ` (${messType} mess)` : ''
  const systemPrompt = `You are a helpful mess assistant for VIT Amaravati hostel students.
Today is ${today}.
The student is in the ${blockCategory} block${messTypeLabel}.

Answer questions based ONLY on the mess menu context provided below.
Do NOT use any outside knowledge about food or menus.
If the answer is not in the context, say exactly: "I don't have menu information for that date or meal."
Be concise, friendly, and accurate. Never make up dish names or dates.

Menu Context:
${context}`

  // Step 4 — build history for Gemini format
  const geminiHistory = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  // Step 5 — call Gemini
  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const chat = geminiModel.startChat({ history: geminiHistory })

  const result = await chat.sendMessage(systemPrompt + '\n\nQuestion: ' + question)

  return {
    answer: result.response.text(),
    sources: relevantChunks,
  }
}

module.exports = { queryRAG }