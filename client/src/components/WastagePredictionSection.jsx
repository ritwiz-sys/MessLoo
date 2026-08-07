import { useMemo, useState } from 'react'

// ── Weighted average ───────────────────────────────────────────────────────────
// index 0 = most recent week → gets highest weight [n, n-1, ..., 1]
function weightedAvg(values) {
  const n = values.length
  if (!n) return 0
  const weights = Array.from({ length: n }, (_, i) => n - i)
  const totalW = weights.reduce((a, b) => a + b, 0)
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW
}

// ── Historical dummy data ──────────────────────────────────────────────────────
// ate_history   : students who ate that meal, last 8 weeks (index 0 = most recent)
// waste_history : kg left in bins after service, last 8 weeks
const HISTORY = {
  MH: [
    {
      block_name: 'MH1', catering_company: 'CRCL', total_students: 248,
      meals: {
        breakfast: { ate_history: [162,172,158,175,165,168,154,170], waste_history: [14.2,12.8,15.6,11.4,13.8,16.2,12.4,14.0] },
        lunch:     { ate_history: [210,205,218,202,212,208,195,215], waste_history: [10.8,12.4, 9.6,13.2,11.0, 9.4,14.0,10.2] },
        snacks:    { ate_history: [140,148,135,152,142,138,130,150], waste_history: [ 7.6, 8.4, 6.8, 9.0, 7.2, 8.0, 6.2, 8.8] },
        dinner:    { ate_history: [194,188,202,185,196,190,182,198], waste_history: [13.4,15.0,12.0,16.2,13.8,14.6,11.6,15.4] },
      },
    },
    {
      block_name: 'MH2', catering_company: 'CRCL', total_students: 272,
      meals: {
        breakfast: { ate_history: [192,182,198,176,188,196,174,184], waste_history: [12.8,14.4,11.2,15.6,13.0,12.0,16.0,13.4] },
        lunch:     { ate_history: [228,220,235,215,230,222,210,238], waste_history: [14.2,16.0,12.6,17.4,14.8,13.4,18.0,15.0] },
        snacks:    { ate_history: [162,170,155,174,160,165,150,172], waste_history: [ 8.1, 9.2, 7.4,10.0, 8.6, 7.8, 9.8, 8.8] },
        dinner:    { ate_history: [206,198,218,192,208,202,188,214], waste_history: [16.0,17.8,14.4,19.2,16.6,15.2,20.0,17.0] },
      },
    },
    {
      block_name: 'MH3', catering_company: 'CRCL', total_students: 220,
      meals: {
        breakfast: { ate_history: [136,148,130,152,140,138,128,146], waste_history: [11.5,10.2,13.0, 9.4,12.2,11.8, 8.8,12.6] },
        lunch:     { ate_history: [188,182,196,178,190,185,174,195], waste_history: [ 9.2,10.6, 8.0,11.8, 9.8, 8.6,12.4, 9.4] },
        snacks:    { ate_history: [118,126,112,130,120,116,108,128], waste_history: [ 6.4, 7.2, 5.8, 8.0, 6.8, 6.0, 7.6, 6.6] },
        dinner:    { ate_history: [178,170,186,165,180,174,162,184], waste_history: [11.8,13.4,10.4,14.8,12.4,11.0,15.2,12.8] },
      },
    },
    {
      block_name: 'MH4', catering_company: 'Sodexo', total_students: 260,
      meals: {
        breakfast: { ate_history: [192,200,188,206,196,194,185,202], waste_history: [10.2,11.6, 9.0,12.8,10.8, 9.6,13.4,10.4] },
        lunch:     { ate_history: [230,222,238,218,232,226,214,240], waste_history: [ 8.6, 9.8, 7.4,11.0, 9.2, 8.0,11.8, 8.8] },
        snacks:    { ate_history: [168,176,160,182,170,166,155,178], waste_history: [ 6.8, 7.6, 6.0, 8.4, 7.2, 6.4, 9.0, 7.0] },
        dinner:    { ate_history: [215,208,224,202,218,212,198,226], waste_history: [11.2,12.8, 9.8,14.2,11.8,10.4,14.8,11.6] },
      },
    },
    {
      block_name: 'MH5', catering_company: 'Sodexo', total_students: 236,
      meals: {
        breakfast: { ate_history: [158,168,152,174,162,160,148,170], waste_history: [13.0,11.6,14.4,10.2,12.8,13.6, 9.8,14.0] },
        lunch:     { ate_history: [188,180,196,174,190,184,172,198], waste_history: [16.4,18.0,14.8,19.6,17.0,15.6,20.4,16.8] },
        snacks:    { ate_history: [140,148,133,154,142,138,128,152], waste_history: [ 7.0, 7.8, 6.2, 8.6, 7.4, 6.6, 9.2, 7.2] },
        dinner:    { ate_history: [174,166,182,160,176,170,158,185], waste_history: [18.2,20.0,16.4,21.8,18.8,17.2,22.4,18.6] },
      },
    },
    {
      block_name: 'MH6', catering_company: 'CRCL', total_students: 284,
      meals: {
        breakfast: { ate_history: [220,212,228,206,222,218,202,230], waste_history: [ 9.4,10.8, 8.0,12.0, 9.8, 8.6,12.8, 9.6] },
        lunch:     { ate_history: [246,238,254,232,248,242,228,256], waste_history: [11.6,13.2,10.0,14.8,12.2,10.8,15.4,11.8] },
        snacks:    { ate_history: [190,198,182,204,192,188,176,200], waste_history: [ 5.8, 6.6, 5.0, 7.4, 6.2, 5.4, 7.8, 6.0] },
        dinner:    { ate_history: [238,230,246,224,240,234,220,248], waste_history: [10.4,12.0, 8.8,13.6,11.0, 9.6,14.2,10.8] },
      },
    },
  ],
  LH: [
    {
      block_name: 'LH1', catering_company: 'CRCL', total_students: 178,
      meals: {
        breakfast: { ate_history: [112,120,106,124,114,110,102,122], waste_history: [10.2, 9.0,11.4, 7.8, 9.8,10.6, 7.4,10.8] },
        lunch:     { ate_history: [148,140,156,136,150,144,132,158], waste_history: [ 8.4, 9.6, 7.2,10.8, 9.0, 7.8,11.4, 8.6] },
        snacks:    { ate_history: [ 98,106, 92,110,100, 96, 88,108], waste_history: [ 5.6, 6.4, 4.8, 7.2, 5.8, 5.2, 7.8, 5.8] },
        dinner:    { ate_history: [136,128,144,124,138,132,120,146], waste_history: [10.8,12.4, 9.4,13.8,11.4,10.0,14.4,11.0] },
      },
    },
    {
      block_name: 'LH2', catering_company: 'Sodexo', total_students: 196,
      meals: {
        breakfast: { ate_history: [140,150,134,155,142,140,130,152], waste_history: [ 8.6, 7.4, 9.8, 6.2, 8.2, 9.4, 6.0, 9.0] },
        lunch:     { ate_history: [166,158,174,154,168,162,150,175], waste_history: [ 7.2, 8.4, 6.0, 9.6, 7.8, 6.6,10.2, 7.4] },
        snacks:    { ate_history: [118,126,112,130,120,116,106,128], waste_history: [ 4.8, 5.6, 4.0, 6.4, 5.2, 4.4, 7.0, 5.0] },
        dinner:    { ate_history: [156,148,164,144,158,152,140,166], waste_history: [ 9.0,10.6, 7.6,12.0, 9.6, 8.2,12.8, 9.2] },
      },
    },
    {
      block_name: 'LH3', catering_company: 'CRCL', total_students: 186,
      meals: {
        breakfast: { ate_history: [122,132,116,136,124,120,112,134], waste_history: [ 9.8, 8.6,11.0, 7.4, 9.4,10.2, 7.0,10.4] },
        lunch:     { ate_history: [150,142,158,138,152,146,134,160], waste_history: [ 9.6,11.0, 8.2,12.4,10.2, 8.8,13.0, 9.8] },
        snacks:    { ate_history: [106,114,100,118,108,104, 96,116], waste_history: [ 5.2, 6.0, 4.4, 6.8, 5.6, 4.8, 7.4, 5.4] },
        dinner:    { ate_history: [138,130,146,126,140,134,122,148], waste_history: [11.4,13.0,10.0,14.4,12.0,10.6,15.0,11.6] },
      },
    },
    {
      block_name: 'LH4', catering_company: 'Sodexo', total_students: 204,
      meals: {
        breakfast: { ate_history: [154,162,148,166,156,152,142,164], waste_history: [ 7.8, 6.6, 9.0, 5.4, 7.4, 8.6, 5.2, 8.2] },
        lunch:     { ate_history: [176,168,184,164,178,172,160,186], waste_history: [ 6.8, 8.0, 5.6, 9.2, 7.4, 6.2, 9.8, 7.0] },
        snacks:    { ate_history: [126,134,120,138,128,124,114,136], waste_history: [ 4.4, 5.2, 3.8, 6.0, 4.8, 4.2, 6.6, 4.6] },
        dinner:    { ate_history: [166,158,174,154,168,162,150,176], waste_history: [ 8.6,10.2, 7.2,11.6, 9.2, 7.8,12.2, 8.8] },
      },
    },
  ],
}

const MEAL_ORDER  = ['breakfast', 'lunch', 'snacks', 'dinner']
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' }
const MEAL_EMOJI  = { breakfast: '🌅', lunch: '🍛', snacks: '🍪', dinner: '🌙' }
const TABS        = [{ key: 'MH', label: 'MH Blocks' }, { key: 'LH', label: 'LH Blocks' }]

// ── Derive per-meal non-consumption + wastage for one block ───────────────────
function computeBlock(block) {
  const byMeal = {}
  for (const [meal, data] of Object.entries(block.meals)) {
    const avgAte    = weightedAvg(data.ate_history)
    const skipCount = Math.round(block.total_students - avgAte)
    const skipPct   = Math.round((skipCount / block.total_students) * 100)
    const wastageKg = parseFloat(weightedAvg(data.waste_history).toFixed(1))
    byMeal[meal]    = { skipCount, skipPct, wastageKg, weeks: data.ate_history.length }
  }
  return byMeal
}

// severity colour for skip %
function skipColor(pct) {
  if (pct >= 35) return '#ef4444'
  if (pct >= 22) return '#f59e0b'
  return '#34d399'
}
// severity colour for waste kg
function wasteColor(kg) {
  if (kg >= 14) return '#ef4444'
  if (kg >=  9) return '#f59e0b'
  return '#34d399'
}

// ── Block card — mirrors PredictionsSection BlockCard exactly ─────────────────
function BlockCard({ block }) {
  const byMeal = useMemo(() => computeBlock(block), [block])
  const totalSkip  = MEAL_ORDER.reduce((s, m) => s + (byMeal[m]?.skipCount  || 0), 0)
  const totalWaste = MEAL_ORDER.reduce((s, m) => s + (byMeal[m]?.wastageKg  || 0), 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#15151c] overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-100">{block.block_name}</h3>
          {block.catering_company && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa' }}>
              {block.catering_company}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{block.total_students} students</span>
      </div>

      {/* Meal rows — same table structure as PredictionsSection */}
      <table className="w-full text-sm text-left">
        <tbody>
          {MEAL_ORDER.map((mealType) => {
            const p = byMeal[mealType]
            return (
              <tr key={mealType} className="border-b border-white/5 last:border-b-0">
                {/* Meal label */}
                <td className="px-4 py-2.5 text-gray-300 whitespace-nowrap">
                  <span className="mr-1.5">{MEAL_EMOJI[mealType]}</span>
                  {MEAL_LABELS[mealType]}
                </td>

                {p ? (
                  <>
                    {/* Skip count */}
                    <td className="px-3 py-2.5 font-medium text-gray-100 whitespace-nowrap">
                      {p.skipCount.toLocaleString()} skip
                    </td>

                    {/* Skip % badge */}
                    <td className="px-2 py-2.5">
                      <span
                        className="rounded-full text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                        style={{
                          background: `${skipColor(p.skipPct)}1a`,
                          color: skipColor(p.skipPct),
                          border: `1px solid ${skipColor(p.skipPct)}35`,
                        }}
                      >
                        {p.skipPct}%
                      </span>
                    </td>

                    {/* Waste kg badge */}
                    <td className="px-2 py-2.5">
                      <span
                        className="rounded-full text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                        style={{
                          background: `${wasteColor(p.wastageKg)}1a`,
                          color: wasteColor(p.wastageKg),
                          border: `1px solid ${wasteColor(p.wastageKg)}35`,
                        }}
                      >
                        🗑 {p.wastageKg} kg
                      </span>
                    </td>

                    {/* Weeks note */}
                    <td className="px-4 py-2.5 text-right text-[11px] text-gray-600 whitespace-nowrap">
                      {p.weeks} wks
                    </td>
                  </>
                ) : (
                  <td colSpan={4} className="px-4 py-2.5 text-gray-600 italic text-xs">
                    No data
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>

        {/* Totals footer — same as PredictionsSection */}
        <tfoot>
          <tr className="border-t border-white/10">
            <td className="px-4 py-2.5 text-gray-400 font-medium">Total</td>
            <td className="px-3 py-2.5 text-gray-100 font-semibold">
              {totalSkip.toLocaleString()} skip
            </td>
            <td />
            <td className="px-2 py-2.5">
              <span className="text-[10px] font-semibold" style={{ color: wasteColor(totalWaste / MEAL_ORDER.length) }}>
                🗑 {totalWaste.toFixed(1)} kg
              </span>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Block grid with loading skeleton (mirrors PredictionsSection BlockGrid) ───
function BlockGrid({ blocks }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {blocks.map((block) => (
        <BlockCard key={block.block_name} block={block} />
      ))}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function WastagePredictionSection() {
  const [activeTab, setActiveTab] = useState('MH')

  const allBlocks = useMemo(() => [...HISTORY.MH, ...HISTORY.LH], [])

  const { totalSkip, totalWaste } = useMemo(() => {
    let ts = 0, tw = 0
    for (const block of allBlocks) {
      const byMeal = computeBlock(block)
      for (const m of MEAL_ORDER) {
        ts += byMeal[m]?.skipCount  || 0
        tw += byMeal[m]?.wastageKg  || 0
      }
    }
    return { totalSkip: ts, totalWaste: tw.toFixed(1) }
  }, [allBlocks])

  return (
    <section>
      {/* Header — mirrors PredictionsSection header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-100 mb-1">Non-Consumption &amp; Wastage Prediction</h1>
        <p className="text-sm text-gray-500">
          Predicted students who won't eat per block and meal today, with estimated bin wastage — weighted average of last 8 weeks.
        </p>
      </div>

      {/* Summary banner — mirrors the purple total banner in PredictionsSection */}
      <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-5 mb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total skipping today (MH + LH)</p>
            <p className="text-3xl font-semibold text-gray-100">{totalSkip.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total predicted wastage</p>
            <p className="text-3xl font-semibold text-gray-100">
              {totalWaste} <span className="text-lg font-medium text-gray-400">kg</span>
            </p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {[['#34d399','skip < 22% · waste < 9 kg'],['#f59e0b','skip 22–34% · waste 9–13 kg'],['#ef4444','skip ≥ 35% · waste ≥ 14 kg']].map(([c,t]) => (
            <div key={c} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
              <span className="text-[11px] text-gray-500">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs — exactly same as PredictionsSection */}
      <div className="flex gap-2 mb-5 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-purple-400 text-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <BlockGrid blocks={HISTORY[activeTab] || []} />

      <p className="text-xs text-gray-700 mt-4 text-center">
        Weighted avg over 8 weeks · Most recent week weighted highest · Connect live attendance + bin logs to replace dummy data
      </p>
    </section>
  )
}
