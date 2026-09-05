const Groq = require('groq-sdk')
const supabase = require('../supabase')

/**
 * Returns ISO date strings for today ± windowDays, in IST.
 */
function getDateRange(windowDays = 3) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const dates = []
  for (let d = -windowDays; d <= windowDays; d++) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    const iso = dt.toISOString().slice(0, 10)
    dates.push(iso)
  }
  return dates
}

/**
 * Fetch menus from Supabase directly (no embeddings, no pgvector).
 */
async function fetchMenuContext(blockCategory, windowDays = 3) {
  const dates = getDateRange(windowDays)
  const todayStr = dates[windowDays] // middle = today

  const { data, error } = await supabase
    .from('menus')
    .select('date, meal_type, items')
    .eq('block_category', blockCategory)
    .eq('is_special', false)
    .in('date', dates)
    .order('date')
    .order('meal_type')

  if (error) {
    console.error('[RAG] Supabase error:', error.message)
    throw new Error('Failed to fetch menu data: ' + error.message)
  }

  if (!data || data.length === 0) {
    return { context: 'No menu data available for the current week.', today: todayStr }
  }

  const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
  const byDate = {}
  for (const row of data) {
    if (!byDate[row.date]) byDate[row.date] = {}
    byDate[row.date][row.meal_type] = row.items
  }

  const lines = []
  for (const date of Object.keys(byDate).sort()) {
    const label = date === todayStr ? `${date} (TODAY)` : date
    lines.push(`\n--- ${label} | ${blockCategory} block ---`)
    for (const meal of MEAL_ORDER) {
      if (byDate[date][meal]) {
        lines.push(`${meal.toUpperCase()}: ${byDate[date][meal]}`)
      }
    }
  }

  return { context: lines.join('\n'), today: todayStr }
}

async function queryRAG(question, blockCategory, messType = null, conversationHistory = []) {
  // Fetch menu data directly from DB — no HuggingFace, no pgvector
  const { context, today } = await fetchMenuContext(blockCategory, 3)

  const todayDisplay = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  ).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  const systemPrompt = `You are a helpful mess assistant for VIT-AP hostel students.
Today is ${todayDisplay} (${today}).
The student is in the ${blockCategory} hostel block.

Answer based ONLY on the menu data below. Never invent dish names or dates.
If the answer is not in the data, say: "I don't have menu information for that."
Be concise and friendly. Format meal lists clearly.

Menu data (${blockCategory}, today ±3 days):
${context}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.1,
    max_tokens: 512,
  })

  return {
    answer: completion.choices[0].message.content,
    sources: [],
  }
}

module.exports = { queryRAG }
