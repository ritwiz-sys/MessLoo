import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
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
                {p ? (
                  <>
                    <td className="px-4 py-2.5 text-gray-100 font-medium">
                      {p.predicted_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.is_special && (
                        <span className="rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-medium px-2 py-0.5 border border-amber-400/30 whitespace-nowrap">
                          ✨ Special
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-gray-600 whitespace-nowrap">
                      Based on {p.based_on_weeks} week{p.based_on_weeks === 1 ? '' : 's'}
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
              {total.toLocaleString()}
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
  const [predictionsByBlock, setPredictionsByBlock] = useState({ MH: [], LH: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await api.getPredictionsToday(token)
      const data = res?.data || {}
      setPredictionsByBlock({ MH: data.MH || [], LH: data.LH || [] })
    } catch (err) {
      setError(err.message || 'Failed to load predictions')
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
        <h1 className="text-xl font-semibold text-gray-100 mb-1">Food Wastage Predictions</h1>
        <p className="text-sm text-gray-500">
          Predicted student turnout per block and meal today, based on recent weeks of attendance.
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
