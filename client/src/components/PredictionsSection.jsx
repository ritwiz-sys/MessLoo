import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/clerk'
import { api } from '../lib/api'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
}

const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '🍛',
  snacks: '🍪',
  dinner: '🌙',
}

const TABS = [
  { key: 'MH', label: 'MH Blocks' },
  { key: 'LH', label: 'LH Blocks' },
]

// ── Dummy fallback — weighted-avg predicted attendance (8 wks of history) ──────
// Used when /predict/today returns no data (no real attendance records yet)
const DUMMY_PREDICTIONS = {
  MH: [
    // MH1 — 248 students
    { block_name: 'MH1', meal_type: 'breakfast', predicted_count: 165, based_on_weeks: 8, is_special: false },
    { block_name: 'MH1', meal_type: 'lunch',     predicted_count: 209, based_on_weeks: 8, is_special: false },
    { block_name: 'MH1', meal_type: 'snacks',    predicted_count: 141, based_on_weeks: 8, is_special: false },
    { block_name: 'MH1', meal_type: 'dinner',    predicted_count: 193, based_on_weeks: 8, is_special: false },
    // MH2 — 272 students
    { block_name: 'MH2', meal_type: 'breakfast', predicted_count: 191, based_on_weeks: 8, is_special: false },
    { block_name: 'MH2', meal_type: 'lunch',     predicted_count: 226, based_on_weeks: 8, is_special: false },
    { block_name: 'MH2', meal_type: 'snacks',    predicted_count: 162, based_on_weeks: 8, is_special: false },
    { block_name: 'MH2', meal_type: 'dinner',    predicted_count: 205, based_on_weeks: 8, is_special: false },
    // MH3 — 220 students
    { block_name: 'MH3', meal_type: 'breakfast', predicted_count: 138, based_on_weeks: 8, is_special: false },
    { block_name: 'MH3', meal_type: 'lunch',     predicted_count: 188, based_on_weeks: 8, is_special: false },
    { block_name: 'MH3', meal_type: 'snacks',    predicted_count: 119, based_on_weeks: 8, is_special: false },
    { block_name: 'MH3', meal_type: 'dinner',    predicted_count: 177, based_on_weeks: 8, is_special: false },
    // MH4 — 260 students
    { block_name: 'MH4', meal_type: 'breakfast', predicted_count: 194, based_on_weeks: 8, is_special: false },
    { block_name: 'MH4', meal_type: 'lunch',     predicted_count: 229, based_on_weeks: 8, is_special: false },
    { block_name: 'MH4', meal_type: 'snacks',    predicted_count: 169, based_on_weeks: 8, is_special: false },
    { block_name: 'MH4', meal_type: 'dinner',    predicted_count: 214, based_on_weeks: 8, is_special: false },
    // MH5 — 236 students
    { block_name: 'MH5', meal_type: 'breakfast', predicted_count: 161, based_on_weeks: 8, is_special: false },
    { block_name: 'MH5', meal_type: 'lunch',     predicted_count: 188, based_on_weeks: 8, is_special: false },
    { block_name: 'MH5', meal_type: 'snacks',    predicted_count: 141, based_on_weeks: 8, is_special: false },
    { block_name: 'MH5', meal_type: 'dinner',    predicted_count: 175, based_on_weeks: 8, is_special: false },
    // MH6 — 284 students
    { block_name: 'MH6', meal_type: 'breakfast', predicted_count: 221, based_on_weeks: 8, is_special: false },
    { block_name: 'MH6', meal_type: 'lunch',     predicted_count: 245, based_on_weeks: 8, is_special: false },
    { block_name: 'MH6', meal_type: 'snacks',    predicted_count: 191, based_on_weeks: 8, is_special: false },
    { block_name: 'MH6', meal_type: 'dinner',    predicted_count: 237, based_on_weeks: 8, is_special: false },
  ],
  LH: [
    // LH1 — 178 students
    { block_name: 'LH1', meal_type: 'breakfast', predicted_count: 113, based_on_weeks: 8, is_special: false },
    { block_name: 'LH1', meal_type: 'lunch',     predicted_count: 148, based_on_weeks: 8, is_special: false },
    { block_name: 'LH1', meal_type: 'snacks',    predicted_count:  99, based_on_weeks: 8, is_special: false },
    { block_name: 'LH1', meal_type: 'dinner',    predicted_count: 136, based_on_weeks: 8, is_special: false },
    // LH2 — 196 students
    { block_name: 'LH2', meal_type: 'breakfast', predicted_count: 141, based_on_weeks: 8, is_special: false },
    { block_name: 'LH2', meal_type: 'lunch',     predicted_count: 166, based_on_weeks: 8, is_special: false },
    { block_name: 'LH2', meal_type: 'snacks',    predicted_count: 119, based_on_weeks: 8, is_special: false },
    { block_name: 'LH2', meal_type: 'dinner',    predicted_count: 156, based_on_weeks: 8, is_special: false },
    // LH3 — 186 students
    { block_name: 'LH3', meal_type: 'breakfast', predicted_count: 124, based_on_weeks: 8, is_special: false },
    { block_name: 'LH3', meal_type: 'lunch',     predicted_count: 150, based_on_weeks: 8, is_special: false },
    { block_name: 'LH3', meal_type: 'snacks',    predicted_count: 107, based_on_weeks: 8, is_special: false },
    { block_name: 'LH3', meal_type: 'dinner',    predicted_count: 138, based_on_weeks: 8, is_special: false },
    // LH4 — 204 students
    { block_name: 'LH4', meal_type: 'breakfast', predicted_count: 156, based_on_weeks: 8, is_special: false },
    { block_name: 'LH4', meal_type: 'lunch',     predicted_count: 176, based_on_weeks: 8, is_special: false },
    { block_name: 'LH4', meal_type: 'snacks',    predicted_count: 127, based_on_weeks: 8, is_special: false },
    { block_name: 'LH4', meal_type: 'dinner',    predicted_count: 166, based_on_weeks: 8, is_special: false },
  ],
}

function BlockCard({ blockName, predictionsByMeal }) {
  const total = MEAL_ORDER.reduce((sum, m) => sum + (predictionsByMeal[m]?.predicted_count || 0), 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#15151c] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-100">{blockName}</h3>
        <span className="text-xs text-gray-500">Today</span>
      </div>

      <table className="w-full text-sm text-left">
        <tbody>
          {MEAL_ORDER.map((mealType) => {
            const p = predictionsByMeal[mealType]
            return (
              <tr key={mealType} className="border-b border-white/5 last:border-b-0">
                <td className="px-4 py-2.5 text-gray-300">
                  <span className="mr-1.5">{MEAL_EMOJI[mealType]}</span>
                  {MEAL_LABELS[mealType]}
                </td>
                {p && p.predicted_count != null ? (
                  <>
                    <td className="px-4 py-2.5 text-gray-100 font-medium">
                      {Number(p.predicted_count).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.is_special && (
                        <span className="rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-medium px-2 py-0.5 border border-amber-400/30 whitespace-nowrap">
                          ✨ Special
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-gray-600 whitespace-nowrap">
                      Based on {p.based_on_weeks ?? '—'} week{p.based_on_weeks === 1 ? '' : 's'}
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className="px-4 py-2.5 text-gray-600 italic text-xs">
                    No prediction available
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10">
            <td className="px-4 py-2.5 text-gray-400 font-medium">Total</td>
            <td colSpan={3} className="px-4 py-2.5 text-gray-100 font-semibold">
              {(total ?? 0).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function BlockGrid({ predictions, loading, error }) {
  const byBlock = useMemo(() => {
    const map = {}
    for (const p of predictions) {
      if (!map[p.block_name]) map[p.block_name] = {}
      map[p.block_name][p.meal_type] = p
    }
    return map
  }, [predictions])

  const blockNames = useMemo(() => Object.keys(byBlock).sort(), [byBlock])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 rounded-2xl border border-white/5 bg-[#15151c] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4">
        {error}
      </div>
    )
  }

  if (blockNames.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#15151c] p-6 text-center text-gray-600 italic text-sm">
        No predictions available yet for this block category.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {blockNames.map((blockName) => (
        <BlockCard key={blockName} blockName={blockName} predictionsByMeal={byBlock[blockName]} />
      ))}
    </div>
  )
}

export default function PredictionsSection() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('MH')
  // Start with dummy data immediately — API will replace if real records exist
  const [predictionsByBlock, setPredictionsByBlock] = useState(DUMMY_PREDICTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usingDummy, setUsingDummy] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await api.getPredictionsToday(token)
      const data = res?.data || {}
      // Only keep rows where predicted_count is a real positive number
      const MH = (data.MH || []).filter((p) => p.predicted_count != null && Number(p.predicted_count) > 0)
      const LH = (data.LH || []).filter((p) => p.predicted_count != null && Number(p.predicted_count) > 0)
      if (MH.length > 0 || LH.length > 0) {
        setPredictionsByBlock({ MH, LH })
        setUsingDummy(false)
      } else {
        // No real predictions yet — always explicitly set dummy data
        setPredictionsByBlock(DUMMY_PREDICTIONS)
        setUsingDummy(true)
      }
    } catch {
      // On any error, show dummy data
      setPredictionsByBlock(DUMMY_PREDICTIONS)
      setUsingDummy(true)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const totalPredicted = useMemo(() => {
    return [...predictionsByBlock.MH, ...predictionsByBlock.LH].reduce(
      (sum, p) => sum + (p.predicted_count || 0),
      0,
    )
  }, [predictionsByBlock])

  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-gray-100">Food Attendance Predictions</h1>
          {usingDummy && !loading && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
            >
              Simulated data
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Predicted student turnout per block and meal today, based on weighted average of recent attendance.
        </p>
      </div>

      <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total predicted meals today (MH + LH)</p>
          <p className="text-3xl font-semibold text-gray-100">
            {loading ? '—' : totalPredicted.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 text-gray-300 text-sm px-4 py-2 transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
          {error}
        </div>
      )}

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

      <BlockGrid
        predictions={predictionsByBlock[activeTab]}
        loading={loading}
        error={null}
      />
    </section>
  )
}
