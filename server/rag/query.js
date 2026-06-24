const { ChromaClient } = require('chromadb')
const { pipeline } = require('@xenova/transformers')
const Groq = require('groq-sdk')

const COLLECTION_NAME = 'mess_menus'

let embedder = null

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return embedder
}

async function queryRAG(question, blockCategory) {
  // Step 1 — embed the question
  const embed = await getEmbedder()
  const output = await embed(question, { pooling: 'mean', normalize: true })
  const questionVector = Array.from(output.data)

  // Step 2 — search ChromaDB
  const client = new ChromaClient()
  const collection = await client.getCollection({ name: COLLECTION_NAME })

  const results = await collection.query({
    queryEmbeddings: [questionVector],
    nResults: 5,
    where: { block_category: blockCategory }
  })

  const relevantChunks = results.documents[0]

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