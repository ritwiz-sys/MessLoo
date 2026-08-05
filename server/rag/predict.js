const supabase = require('../supabase')

// ─── Attendance prediction ────────────────────────────────────────────────────

async function predictAttendance(date, mealType, blockId, blockName, blockCategory) {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })

  // Fetch last 8 records for this block + meal type before today
  const { data: history, error } = await supabase
    .from('meal_attendance_summary')
    .select('eating_count, total_count, is_special, date')
    .eq('meal_type', mealType)
    .eq('block_id', blockId)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(8)

  if (error) {
    console.log(`predictAttendance(${blockName}, ${mealType}) query error:`, error.message)
    return null
  }
  if (!history || history.length === 0) return null

  // Prefer same-weekday rows; fall back to all recent rows when data is sparse
  const sameDayHistory = history.filter(row => {
    const d = new Date(row.date).toLocaleDateString('en-US', { weekday: 'long' })
    return d === dayOfWeek
  })
  const usableHistory = sameDayHistory.length > 0 ? sameDayHistory : history

  if (sameDayHistory.length === 0) {
    console.log(`predictAttendance(${blockName}, ${mealType}): no ${dayOfWeek} rows, falling back to most recent ${usableHistory.length} records`)
  }

  // Weighted average — most recent row gets highest weight
  let weightedSum = 0
  let totalWeight = 0
  usableHistory.forEach((row, index) => {
    const weight = usableHistory.length - index
    weightedSum += row.eating_count * weight
    totalWeight += weight
  })
  let predicted = Math.round(weightedSum / totalWeight)

  // Check if today's menu is marked special
  const { data: todayMenu } = await supabase
    .from('menus')
    .select('is_special')
    .eq('date', date)
    .eq('meal_type', mealType)
    .eq('block_category', blockCategory)
    .is('block_id', null)
    .single()

  const isSpecial = todayMenu?.is_special || false
  if (isSpecial) predicted = Math.round(predicted * 1.25)

  // Fetch total student count for this block+meal from the summary table
  const { data: blockData } = await supabase
    .from('meal_attendance_summary')
    .select('total_count')
    .eq('block_id', blockId)
    .eq('meal_type', mealType)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const totalStudents = blockData?.total_count || 0
  const predictedSkips = Math.max(0, totalStudents - predicted)

  return {
    date,
    meal_type: mealType,
    block_id: blockId,
    block_name: blockName,
    block_category: blockCategory,
    day_of_week: dayOfWeek,
    predicted_eating: predicted,
    predicted_skips: predictedSkips,
    total_students: totalStudents,
    is_special: isSpecial,
    based_on_weeks: usableHistory.length,
  }
}

// ─── Wastage prediction ───────────────────────────────────────────────────────

async function predictWastage(date, mealType, blockId, blockName) {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })

  // Fetch last 8 completed drum logs for this block + meal type before today
  const { data: history, error } = await supabase
    .from('meal_drum_log')
    .select('wastage_kg, total_prepared_kg, meal_date')
    .eq('block_id', blockId)
    .eq('meal_type', mealType)
    .eq('status', 'completed')
    .lt('meal_date', date)
    .order('meal_date', { ascending: false })
    .limit(8)

  if (error) {
    console.log(`predictWastage(${blockName}, ${mealType}) query error:`, error.message)
    return null
  }
  if (!history || history.length === 0) return null

  // Prefer same-weekday rows; fall back to all recent rows when data is sparse
  const sameDayHistory = history.filter(row => {
    const d = new Date(row.meal_date).toLocaleDateString('en-US', { weekday: 'long' })
    return d === dayOfWeek
  })
  const usableHistory = sameDayHistory.length > 0 ? sameDayHistory : history

  // Weighted average of wastage_kg and total_prepared_kg independently
  let weightedWastageSum = 0
  let weightedPreparedSum = 0
  let totalWeight = 0
  usableHistory.forEach((row, index) => {
    const weight = usableHistory.length - index
    weightedWastageSum += (row.wastage_kg || 0) * weight
    weightedPreparedSum += (row.total_prepared_kg || 0) * weight
    totalWeight += weight
  })

  const predicted_wastage_kg = Math.round((weightedWastageSum / totalWeight) * 10) / 10
  const predicted_prepared_kg = Math.round((weightedPreparedSum / totalWeight) * 10) / 10
  const predicted_wastage_percent = predicted_prepared_kg > 0
    ? Math.round((predicted_wastage_kg / predicted_prepared_kg) * 100 * 10) / 10
    : 0

  // Fetch drum capacity for this specific block
  const { data: drumSettings } = await supabase
    .from('drum_settings')
    .select('drum_capacity_kg')
    .eq('block_id', blockId)
    .single()

  const capacity = drumSettings?.drum_capacity_kg || 50
  const recommended_kg = Math.max(0, predicted_prepared_kg - predicted_wastage_kg)
  const recommended_drums = Math.ceil(recommended_kg / capacity)

  return {
    date,
    meal_type: mealType,
    block_id: blockId,
    block_name: blockName,
    day_of_week: dayOfWeek,
    predicted_wastage_kg,
    predicted_prepared_kg,
    predicted_wastage_percent,
    recommended_drums,
    recommended_kg,
    based_on_weeks: usableHistory.length,
  }
}

// ─── Combined prediction for all meals today ─────────────────────────────────

async function predictTodayAllMeals(blockCategory) {
  const today = new Date().toISOString().slice(0, 10)
  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner']

  const { data: blocks, error } = await supabase
    .from('blocks')
    .select('id, name, block_category')
    .eq('block_category', blockCategory)

  if (error) {
    console.log('predictTodayAllMeals blocks lookup error:', error.message)
    return []
  }
  if (!blocks || blocks.length === 0) return []

  const results = []

  for (const block of blocks) {
    for (const meal of mealTypes) {
      const [attendance, wastage] = await Promise.all([
        predictAttendance(today, meal, block.id, block.name, block.block_category),
        predictWastage(today, meal, block.id, block.name),
      ])

      if (attendance || wastage) {
        results.push({
          block_id: block.id,
          block_name: block.name,
          meal_type: meal,
          attendance,
          wastage,
        })
      }
    }
  }

  return results
}

module.exports = { predictAttendance, predictWastage, predictTodayAllMeals }
