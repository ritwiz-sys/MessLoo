const Groq = require('groq-sdk')
const supabase = require('../supabase')

function getDateRange(windowDays = 3) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const dates = []
  for (let d = -windowDays; d <= windowDays; d++) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    dates.push(dt.toISOString().slice(0, 10))
  }
  return dates
}

async function fetchMenuContext(blockCategory, windowDays = 3) {
  const dates = getDateRange(windowDays)
  const todayStr = dates[windowDays]

  console.log(`[RAG] Fetching menus for ${blockCategory}, dates: ${dates.join(', ')}`)

  // Try with is_special filter first; fall back without it if column missing
  let data, error
  ;({ data, error } = await supabase
    .from('menus')
    .select('date, meal_type, items')
    .eq('block_category', blockCategory)
    .eq('is_special', false)
    .in('date', dates)
    .order('date')
    .order('meal_type'))

  if (error) {
    console.warn('[RAG] is_special filter failed, retrying without it:', error.message)
    ;({ data, error } = await supabase
      .from('menus')
      .select('date, meal_type, items')
      .eq('block_category', blockCategory)
      .in('date', dates)
      .order('date')
      .order('meal_type'))
  }

  if (error) {
    console.error('[RAG] Supabase error:', error.message)
    throw new Error('Supabase query failed: ' + error.message)
  }

  console.log(`[RAG] Fetched ${data?.length ?? 0} menu rows`)

  if (!data || data.length === 0) {
    return {
      context: `No menu data found for ${blockCategory} block around ${todayStr}. The menu may not have been uploaded yet.`,
      today: todayStr,
    }
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
    lines.push(`\n--- ${label} ---`)
    for (const meal of MEAL_ORDER) {
      if (byDate[date][meal]) {
        lines.push(`${meal.toUpperCase()}: ${byDate[date][meal]}`)
      }
    }
  }

  return { context: lines.join('\n'), today: todayStr }
}

async function queryRAG(question, blockCategory, messType = null, conversationHistory = []) {
  // 1 — Check Groq key exists
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set on the server.')
  }

  // 2 — Fetch menu data
  const { context, today } = await fetchMenuContext(blockCategory, 3)

  const todayDisplay = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  ).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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

  // 3 — Call Groq
  console.log('[RAG] Calling Groq...')
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.1,
    max_tokens: 512,
  })

  console.log('[RAG] Groq responded OK')

  return {
    answer: completion.choices[0].message.content,
    sources: [],
  }
}

module.exports = { queryRAG }
