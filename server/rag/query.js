const Groq = require('groq-sdk')
const supabase = require('../supabase')

/**
 * Build a ±windowDays date range around today (IST).
 */
function getDateRange(windowDays = 4) {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )
  const dates = []
  for (let d = -windowDays; d <= windowDays; d++) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    dates.push(dt.toISOString().slice(0, 10))
  }
  return dates
}

/**
 * Fetch menus from Supabase for a block category within a date window.
 * Returns formatted text context.
 */
async function fetchMenuContext(blockCategory, windowDays = 4) {
  const dates = getDateRange(windowDays)
  const todayStr = dates[windowDays] // middle element = today

  const { data, error } = await supabase
    .from('menus')
    .select('date, meal_type, items, is_special')
    .eq('block_category', blockCategory)
    .eq('is_special', false)
    .in('date', dates)
    .order('date')
    .order('meal_type')

  if (error) {
    console.error('Supabase menu fetch error:', error.message)
    throw error
  }

  if (!data || data.length === 0) {
    return { context: 'No menu data available for the current period.', today: todayStr }
  }

  // Group by date
  const byDate = {}
  for (const row of data) {
    if (!byDate[row.date]) byDate[row.date] = []
    byDate[row.date].push(row)
  }

  const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
  const lines = []

  for (const date of Object.keys(byDate).sort()) {
    const dayLabel = date === todayStr ? `${date} (TODAY)` : date
    lines.push(`\n📅 ${dayLabel} — ${blockCategory} block:`)
    const meals = byDate[date].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    )
    for (const m of meals) {
      lines.push(`  ${m.meal_type.toUpperCase()}: ${m.items}`)
    }
  }

  return { context: lines.join('\n'), today: todayStr }
}

async function queryRAG(question, blockCategory, messType = null, conversationHistory = []) {
  // Step 1 — fetch menu context directly from Supabase (no embeddings needed)
  const { context, today } = await fetchMenuContext(blockCategory, 4)

  // Step 2 — build system prompt
  const todayDisplay = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  ).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  const systemPrompt = `You are a helpful mess assistant for VIT Amaravati hostel students.
Today is ${todayDisplay} (${today}).
The student is in the ${blockCategory} block.

Answer questions based ONLY on the mess menu context provided below.
Do NOT use any outside knowledge about food or menus.
If the answer is not in the context, say exactly: "I don't have menu information for that."
Be concise, friendly, and accurate. Never make up dish names or dates.
When listing items, format them clearly. Refer to meals by name (Breakfast, Lunch, Snacks, Dinner).

Menu Data (${blockCategory} block, ±4 days around today):
${context}`

  // Step 3 — build messages array
  const historyMessages = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: question },
  ]

  // Step 4 — call Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
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
