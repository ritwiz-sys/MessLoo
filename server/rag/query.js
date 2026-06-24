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

async function queryRAG(question, blockCategory) {
  // Step 1 — embed the question
  const questionVector = await getEmbedding(question)

  // Step 2 — search pgvector
  const { data: results, error } = await supabase.rpc('match_menus', {
    query_embedding: questionVector,
    match_count: 5,
    filter_block_category: blockCategory
  })

  if (error) {
    console.error('pgvector search error:', error.message)
    throw error
  }

  const relevantChunks = results.map(r => r.content)

  // Step 3 — build prompt
  const context = relevantChunks.join('\n\n')

  const prompt = `You are a helpful mess assistant for VIT Amaravati students.
Answer the student's question based ONLY on the mess menu context provided below.
If the answer is not in the context, say "I don't have that information in the current menu."
Be concise and friendly.

Menu Context:
${context}

Student Question: ${question}`

  // Step 4 — call Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  })

  return {
    answer: completion.choices[0].message.content,
    sources: relevantChunks
  }
}

module.exports = { queryRAG }