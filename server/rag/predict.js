const supabase = require('../supabase')

async function predictAttendance(date, mealType, blockId, blockName, blockCategory) {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })

  // Fetch last 8 records for same block + same meal type
  const { data: history, error } = await supabase
    .from('meal_attendance_summary')
    .select('eating_count, is_special, date')
    .eq('meal_type', mealType)
    .eq('block_id', blockId)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(8)

  if (error) {
    console.log(`predictAttendance(${blockName}, ${mealType}) query error:`, error.message)
    return null
  }
  if (!history || history.length === 0) {
    console.log(`predictAttendance(${blockName}, ${mealType}): no history rows found in meal_attendance_summary`)
    return null
  }

  // Prefer rows that fall on the same weekday as today (most predictive),
  // but fall back to the plain most-recent history if the data doesn't
  // happen to have any same-weekday rows yet (e.g. sparse/uneven seed data).
  const sameDayHistory = history.filter(row => {
    const d = new Date(row.date).toLocaleDateString('en-US', { weekday: 'long' })
    return d === dayOfWeek
  })

  const usableHistory = sameDayHistory.length > 0 ? sameDayHistory : history
  if (sameDayHistory.length === 0) {
    console.log(`predictAttendance(${blockName}, ${mealType}): no ${dayOfWeek} rows in history, falling back to most recent ${usableHistory.length} records`)
  }

  // Weighted average
  let weightedSum = 0
  let totalWeight = 0

  usableHistory.forEach((row, index) => {
    const weight = usableHistory.length - index
    weightedSum += row.eating_count * weight
    totalWeight += weight
  })

  let predicted = Math.round(weightedSum / totalWeight)

  // Check if today's meal is special
  const { data: todayMenu } = await supabase
    .from('menus')
    .select('is_special')
    .eq('date', date)
    .eq('meal_type', mealType)
    .eq('block_category', blockCategory)
    .is('block_id', null)
    .single()

  const isSpecial = todayMenu?.is_special || false

  if (isSpecial) {
    predicted = Math.round(predicted * 1.25)
  }

  return {
    date,
    meal_type: mealType,
    block_id: blockId,
    block_name: blockName,
    block_category: blockCategory,
    day_of_week: dayOfWeek,
    predicted_count: predicted,
    is_special: isSpecial,
    based_on_weeks: usableHistory.length
  }
}

async function predictTodayAllMeals(blockCategory) {
  const today = new Date().toISOString().slice(0, 10)
  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner']

  // Get all blocks for this category
  const { data: blocks, error } = await supabase
    .from('blocks')
    .select('id, name, block_category')
    .eq('block_category', blockCategory)

  if (error) {
    console.log('predictTodayAllMeals blocks lookup error:', error.message)
    return []
  }
  if (!blocks) return []

  console.log(`predictTodayAllMeals: found ${blocks.length} blocks for ${blockCategory}`)

  const results = []

  for (const block of blocks) {
    for (const meal of mealTypes) {
      const prediction = await predictAttendance(
        today, meal, block.id, block.name, block.block_category
      )
      if (prediction) results.push(prediction)
    }
  }

  console.log(`predictTodayAllMeals: produced ${results.length} predictions for ${blockCategory}`)

  return results
}

module.exports = { predictAttendance, predictTodayAllMeals }