const Groq = require('groq-sdk')
const supabase = require('../supabase')

// Priority list — we try these in order and use the first one available on the account
const PREFERRED_MODELS = [
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'gemma2-9b-it',
  'gemma-7b-it',
  'mixtral-8x7b-32768',
]

let _cachedModel = null
async function pickModel(groq) {
  if (_cachedModel) return _cachedModel
  try {
    const list = await groq.models.list()
    const available = new Set(list.data.map((m) => m.id))
    console.log('[RAG] Available Groq models:', [...available].join(', '))
    for (const m of PREFERRED_MODELS) {
      if (available.has(m)) {
        _cachedModel = m
        console.log('[RAG] Selected model:', m)
        return m
      }
    }
    // fallback: use whatever the first chat-capable model is
    _cachedModel = list.data[0]?.id || 'llama-3.1-8b-instant'
    console.log('[RAG] Fallback model:', _cachedModel)
    return _cachedModel
  } catch (err) {
    console.warn('[RAG] Could not list models, defaulting:', err.message)
    return 'llama-3.1-8b-instant'
  }
}

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

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const todayDisplay = nowIST.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeIST = nowIST.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  // Determine current/next meal based on IST hour
  const hour = nowIST.getHours()
  const currentMealWindow =
    hour < 9  ? 'Breakfast (7:30–9:30 AM) is the current/upcoming meal' :
    hour < 13 ? 'Lunch (12:00–2:30 PM) is the current/upcoming meal' :
    hour < 17 ? 'Snacks (4:30–6:00 PM) is the current/upcoming meal' :
    hour < 22 ? 'Dinner (7:30–10:00 PM) is the current/upcoming meal' :
                'All meals for today are over. Next is tomorrow\'s Breakfast.'

  const systemPrompt = `You are MunchBot 🍛 — the smart, friendly mess assistant for VIT-AP University hostel students.

CONTEXT
• Today: ${todayDisplay} | Current time (IST): ${timeIST}
• ${currentMealWindow}
• Student's block: ${blockCategory} hostel

YOUR JOB
Answer the student's question naturally and helpfully based on the menu data provided. You are not just a data fetcher — you're a knowledgeable assistant who understands what students actually care about.

HOW TO RESPOND
- If asked "what's for [meal]?" → List the dishes clearly, add a short vibe (e.g. "Looks like a solid lunch 💪" or "Light breakfast today")
- If asked "is the food good today?" → Give an honest read based on the dishes listed (variety, balance, any special items)
- If asked about a specific dish → Check all days and tell them when it appears
- If asked "what should I eat?" → Recommend based on what's available right now or next
- If asked about the week → Give a brief overview of highlights across the days
- If something isn't in the data → Say so honestly, suggest they check the notice board or ask mess staff
- For general questions not about the menu → Answer helpfully, stay in character as a mess assistant

FORMAT
- Keep answers short and scannable — students are usually checking on their phone
- Use bullet points or line breaks for meal lists, not long paragraphs
- Add a relevant emoji or two where it fits naturally (don't overdo it)
- Be warm and casual, like a helpful senior student — not a robot reading a spreadsheet

ACCURACY RULES
- Never invent dish names, dates, or meal times
- Always base food answers on the menu data below
- If a date is marked (TODAY), that's the reference point for "today", "now", "current"

MENU DATA — ${blockCategory} block, today ±3 days:
${context}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  // 3 — Call Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const model = await pickModel(groq)
  console.log('[RAG] Calling Groq with model:', model)

  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
    max_tokens: 700,
  })

  console.log('[RAG] Groq responded OK')

  return {
    answer: completion.choices[0].message.content,
    sources: [],
  }
}

module.exports = { queryRAG }
