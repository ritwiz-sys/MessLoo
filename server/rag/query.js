const Groq = require('groq-sdk')
const supabase = require('../supabase')

// Priority list — updated to match models actually available on this Groq account
const PREFERRED_MODELS = [
  'groq/compound-mini',
  'groq/compound',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  // legacy names as fallback
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
]

// Models that are NOT chat-completion capable (classifiers, speech, TTS, etc.)
const NON_CHAT_MODELS = [
  'whisper', 'prompt-guard', 'orpheus', 'allam', 'safeguard',
]

function isChatModel(id) {
  const lower = id.toLowerCase()
  return !NON_CHAT_MODELS.some((skip) => lower.includes(skip))
}

let _cachedModel = null
async function pickModel(groq) {
  if (_cachedModel) return _cachedModel
  try {
    const list = await groq.models.list()
    const available = new Set(list.data.map((m) => m.id))
    console.log('[RAG] Available Groq models:', [...available].join(', '))
    // Try preferred list first
    for (const m of PREFERRED_MODELS) {
      if (available.has(m)) {
        _cachedModel = m
        console.log('[RAG] Selected model:', m)
        return m
      }
    }
    // Fallback: first chat-capable model from account
    const chatModels = list.data.map((m) => m.id).filter(isChatModel)
    _cachedModel = chatModels[0] || 'groq/compound-mini'
    console.log('[RAG] Fallback chat model:', _cachedModel)
    return _cachedModel
  } catch (err) {
    console.warn('[RAG] Could not list models, defaulting:', err.message)
    return 'groq/compound-mini'
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
You are a conversational assistant — answer what the student actually asked. Do NOT volunteer menu data unless they ask for it.

HOW TO RESPOND
- "hi", "hello", "hey" or any greeting → Greet back warmly in 1–2 lines. Ask what they'd like to know. Do NOT dump the menu.
- "what's for [meal]?" / "today's menu?" → List the dishes, then add a one-line fitness note (e.g. "High protein today 💪" or "Fairly heavy — maybe skip the second roti if you're watching calories")
- "is the food healthy?" / "is this good for me?" / fitness questions → Give a genuine nutritional read: protein sources, carb load, whether it's balanced, what to skip or prioritise
- "should I eat?" / "what's good?" → Recommend based on what's available now, with a fitness angle
- "when is X served?" → Check all days in the data and tell them
- Greetings, small talk, general questions → Respond naturally. Don't mention the menu unless relevant.
- Something not in the data → Be honest, suggest they check the notice board

FITNESS PERSPECTIVE (add this when food is discussed)
- Call out protein sources (dal, paneer, eggs, sprouts, curd, milk)
- Flag heavy carb loads (too much rice + roti + bread in one meal)
- Note fibre and veggies (salads, sabzis, fruits)
- Give a simple verdict: "Balanced ✅", "Carb-heavy 🍚 — pair with curd for protein", "Light meal — good if you had a big lunch", etc.
- Keep it practical, not preachy — 1–2 lines max on fitness unless they ask more

FORMAT
- Keep answers short and scannable
- Use bullets for dish lists, prose for fitness notes
- Warm and casual, like a helpful senior — not a robot

ACCURACY RULES
- Never invent dish names, dates, or meal times
- Base all food answers strictly on the menu data below
- If a date is marked (TODAY), that's the reference for "today" / "now"

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
    max_tokens: 512,
  })

  console.log('[RAG] Groq responded OK')

  return {
    answer: completion.choices[0].message.content,
    sources: [],
  }
}

module.exports = { queryRAG, pickModel }
