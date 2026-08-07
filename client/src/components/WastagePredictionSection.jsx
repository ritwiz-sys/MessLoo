import { useMemo, useState } from 'react'

// ── Weighted average — index 0 = most recent week (highest weight) ─────────────
// weights: [n, n-1, ..., 1] normalised
function weightedAvg(values) {
  const n = values.length
  if (!n) return 0
  const weights = Array.from({ length: n }, (_, i) => n - i) // [8,7,6,5,4,3,2,1]
  const totalW = weights.reduce((a, b) => a + b, 0)
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW
}

// ── Historical dummy data ──────────────────────────────────────────────────────
// ate_history  : how many students actually ate that meal, last 8 weeks (index 0 = most recent)
// waste_history: kg of food left in bins after meal service, last 8 weeks
// total_students is fixed per block

const HISTORY = {
  MH: [
    {
      block_name: 'MH1', catering_company: 'CRCL', total_students: 248,
      meals: {
        breakfast: {
          ate_history:   [162, 172, 158, 175, 165, 168, 154, 170],
          waste_history: [14.2, 12.8, 15.6, 11.4, 13.8, 16.2, 12.4, 14.0],
        },
        lunch: {
          ate_history:   [210, 205, 218, 202, 212, 208, 195, 215],
          waste_history: [10.8, 12.4,  9.6, 13.2, 11.0,  9.4, 14.0, 10.2],
        },
        snacks: {
          ate_history:   [140, 148, 135, 152, 142, 138, 130, 150],
          waste_history: [ 7.6,  8.4,  6.8,  9.0,  7.2,  8.0,  6.2,  8.8],
        },
        dinner: {
          ate_history:   [194, 188, 202, 185, 196, 190, 182, 198],
          waste_history: [13.4, 15.0, 12.0, 16.2, 13.8, 14.6, 11.6, 15.4],
        },
      },
    },
    {
      block_name: 'MH2', catering_company: 'CRCL', total_students: 272,
      meals: {
        breakfast: {
          ate_history:   [192, 182, 198, 176, 188, 196, 174, 184],
          waste_history: [12.8, 14.4, 11.2, 15.6, 13.0, 12.0, 16.0, 13.4],
        },
        lunch: {
          ate_history:   [228, 220, 235, 215, 230, 222, 210, 238],
          waste_history: [14.2, 16.0, 12.6, 17.4, 14.8, 13.4, 18.0, 15.0],
        },
        snacks: {
          ate_history:   [162, 170, 155, 174, 160, 165, 150, 172],
          waste_history: [ 8.1,  9.2,  7.4, 10.0,  8.6,  7.8,  9.8,  8.8],
        },
        dinner: {
          ate_history:   [206, 198, 218, 192, 208, 202, 188, 214],
          waste_history: [16.0, 17.8, 14.4, 19.2, 16.6, 15.2, 20.0, 17.0],
        },
      },
    },
    {
      block_name: 'MH3', catering_company: 'CRCL', total_students: 220,
      meals: {
        breakfast: {
          ate_history:   [136, 148, 130, 152, 140, 138, 128, 146],
          waste_history: [11.5, 10.2, 13.0,  9.4, 12.2, 11.8,  8.8, 12.6],
        },
        lunch: {
          ate_history:   [188, 182, 196, 178, 190, 185, 174, 195],
          waste_history: [ 9.2, 10.6,  8.0, 11.8,  9.8,  8.6, 12.4,  9.4],
        },
        snacks: {
          ate_history:   [118, 126, 112, 130, 120, 116, 108, 128],
          waste_history: [ 6.4,  7.2,  5.8,  8.0,  6.8,  6.0,  7.6,  6.6],
        },
        dinner: {
          ate_history:   [178, 170, 186, 165, 180, 174, 162, 184],
          waste_history: [11.8, 13.4, 10.4, 14.8, 12.4, 11.0, 15.2, 12.8],
        },
      },
    },
    {
      block_name: 'MH4', catering_company: 'Sodexo', total_students: 260,
      meals: {
        breakfast: {
          ate_history:   [192, 200, 188, 206, 196, 194, 185, 202],
          waste_history: [10.2, 11.6,  9.0, 12.8, 10.8,  9.6, 13.4, 10.4],
        },
        lunch: {
          ate_history:   [230, 222, 238, 218, 232, 226, 214, 240],
          waste_history: [ 8.6,  9.8,  7.4, 11.0,  9.2,  8.0, 11.8,  8.8],
        },
        snacks: {
          ate_history:   [168, 176, 160, 182, 170, 166, 155, 178],
          waste_history: [ 6.8,  7.6,  6.0,  8.4,  7.2,  6.4,  9.0,  7.0],
        },
        dinner: {
          ate_history:   [215, 208, 224, 202, 218, 212, 198, 226],
          waste_history: [11.2, 12.8,  9.8, 14.2, 11.8, 10.4, 14.8, 11.6],
        },
      },
    },
    {
      block_name: 'MH5', catering_company: 'Sodexo', total_students: 236,
      meals: {
        breakfast: {
          ate_history:   [158, 168, 152, 174, 162, 160, 148, 170],
          waste_history: [13.0, 11.6, 14.4, 10.2, 12.8, 13.6,  9.8, 14.0],
        },
        lunch: {
          ate_history:   [188, 180, 196, 174, 190, 184, 172, 198],
          waste_history: [16.4, 18.0, 14.8, 19.6, 17.0, 15.6, 20.4, 16.8],
        },
        snacks: {
          ate_history:   [140, 148, 133, 154, 142, 138, 128, 152],
          waste_history: [ 7.0,  7.8,  6.2,  8.6,  7.4,  6.6,  9.2,  7.2],
        },
        dinner: {
          ate_history:   [174, 166, 182, 160, 176, 170, 158, 185],
          waste_history: [18.2, 20.0, 16.4, 21.8, 18.8, 17.2, 22.4, 18.6],
        },
      },
    },
    {
      block_name: 'MH6', catering_company: 'CRCL', total_students: 284,
      meals: {
        breakfast: {
          ate_history:   [220, 212, 228, 206, 222, 218, 202, 230],
          waste_history: [ 9.4, 10.8,  8.0, 12.0,  9.8,  8.6, 12.8,  9.6],
        },
        lunch: {
          ate_history:   [246, 238, 254, 232, 248, 242, 228, 256],
          waste_history: [11.6, 13.2, 10.0, 14.8, 12.2, 10.8, 15.4, 11.8],
        },
        snacks: {
          ate_history:   [190, 198, 182, 204, 192, 188, 176, 200],
          waste_history: [ 5.8,  6.6,  5.0,  7.4,  6.2,  5.4,  7.8,  6.0],
        },
        dinner: {
          ate_history:   [238, 230, 246, 224, 240, 234, 220, 248],
          waste_history: [10.4, 12.0,  8.8, 13.6, 11.0,  9.6, 14.2, 10.8],
        },
      },
    },
  ],
  LH: [
    {
      block_name: 'LH1', catering_company: 'CRCL', total_students: 178,
      meals: {
        breakfast: {
          ate_history:   [112, 120, 106, 124, 114, 110, 102, 122],
          waste_history: [10.2,  9.0, 11.4,  7.8,  9.8, 10.6,  7.4, 10.8],
        },
        lunch: {
          ate_history:   [148, 140, 156, 136, 150, 144, 132, 158],
          waste_history: [ 8.4,  9.6,  7.2, 10.8,  9.0,  7.8, 11.4,  8.6],
        },
        snacks: {
          ate_history:   [ 98, 106,  92, 110, 100,  96,  88, 108],
          waste_history: [ 5.6,  6.4,  4.8,  7.2,  5.8,  5.2,  7.8,  5.8],
        },
        dinner: {
          ate_history:   [136, 128, 144, 124, 138, 132, 120, 146],
          waste_history: [10.8, 12.4,  9.4, 13.8, 11.4, 10.0, 14.4, 11.0],
        },
      },
    },
    {
      block_name: 'LH2', catering_company: 'Sodexo', total_students: 196,
      meals: {
        breakfast: {
          ate_history:   [140, 150, 134, 155, 142, 140, 130, 152],
          waste_history: [ 8.6,  7.4,  9.8,  6.2,  8.2,  9.4,  6.0,  9.0],
        },
        lunch: {
          ate_history:   [166, 158, 174, 154, 168, 162, 150, 175],
          waste_history: [ 7.2,  8.4,  6.0,  9.6,  7.8,  6.6, 10.2,  7.4],
        },
        snacks: {
          ate_history:   [118, 126, 112, 130, 120, 116, 106, 128],
          waste_history: [ 4.8,  5.6,  4.0,  6.4,  5.2,  4.4,  7.0,  5.0],
        },
        dinner: {
          ate_history:   [156, 148, 164, 144, 158, 152, 140, 166],
          waste_history: [ 9.0, 10.6,  7.6, 12.0,  9.6,  8.2, 12.8,  9.2],
        },
      },
    },
    {
      block_name: 'LH3', catering_company: 'CRCL', total_students: 186,
      meals: {
        breakfast: {
          ate_history:   [122, 132, 116, 136, 124, 120, 112, 134],
          waste_history: [ 9.8,  8.6, 11.0,  7.4,  9.4, 10.2,  7.0, 10.4],
        },
        lunch: {
          ate_history:   [150, 142, 158, 138, 152, 146, 134, 160],
          waste_history: [ 9.6, 11.0,  8.2, 12.4, 10.2,  8.8, 13.0,  9.8],
        },
        snacks: {
          ate_history:   [106, 114, 100, 118, 108, 104,  96, 116],
          waste_history: [ 5.2,  6.0,  4.4,  6.8,  5.6,  4.8,  7.4,  5.4],
        },
        dinner: {
          ate_history:   [138, 130, 146, 126, 140, 134, 122, 148],
          waste_history: [11.4, 13.0, 10.0, 14.4, 12.0, 10.6, 15.0, 11.6],
        },
      },
    },
    {
      block_name: 'LH4', catering_company: 'Sodexo', total_students: 204,
      meals: {
        breakfast: {
          ate_history:   [154, 162, 148, 166, 156, 152, 142, 164],
          waste_history: [ 7.8,  6.6,  9.0,  5.4,  7.4,  8.6,  5.2,  8.2],
        },
        lunch: {
          ate_history:   [176, 168, 184, 164, 178, 172, 160, 186],
          waste_history: [ 6.8,  8.0,  5.6,  9.2,  7.4,  6.2,  9.8,  7.0],
        },
        snacks: {
          ate_history:   [126, 134, 120, 138, 128, 124, 114, 136],
          waste_history: [ 4.4,  5.2,  3.8,  6.0,  4.8,  4.2,  6.6,  4.6],
        },
        dinner: {
          ate_history:   [166, 158, 174, 154, 168, 162, 150, 176],
          waste_history: [ 8.6, 10.2,  7.2, 11.6,  9.2,  7.8, 12.2,  8.8],
        },
      },
    },
  ],
}

// ── Compute predictions from history ──────────────────────────────────────────
function computePredictions(block) {
  const result = {}
  for (const [meal, data] of Object.entries(block.meals)) {
    const avgAte = weightedAvg(data.ate_history)
    const skipPct = Math.round(((block.total_students - avgAte) / block.total_students) * 100)
    const wastageKg = parseFloat(weightedAvg(data.waste_history).toFixed(1))
    const weeks = data.ate_history.length
    result[meal] = { skipPct, wastageKg, weeks }
  }
  return result
}

// ── Color helpers ──────────────────────────────────────────────────────────────
const skipColor = (pct) => pct >= 35 ? '#ef4444' : pct >= 22 ? '#f59e0b' : '#34d399'
const wasteColor = (kg)  => kg  >= 14 ? '#ef4444' : kg  >= 9  ? '#f59e0b' : '#34d399'

// ── Mini bar ──────────────────────────────────────────────────────────────────
function Bar({ value, max, color }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Sparkline (last 8 values) ──────────────────────────────────────────────────
function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const range = mx - mn || 1
  const W = 48, H = 18, pad = 2
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - mn) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
const MEAL_LABEL = { breakfast: '🌅 Breakfast', lunch: '🍛 Lunch', snacks: '🍪 Snacks', dinner: '🌙 Dinner' }
const TABS = [{ key: 'MH', label: 'MH Blocks' }, { key: 'LH', label: 'LH Blocks' }]

// ── Block card ────────────────────────────────────────────────────────────────
function BlockCard({ block }) {
  const preds = useMemo(() => computePredictions(block), [block])
  const totalWaste = MEAL_ORDER.reduce((s, m) => s + (preds[m]?.wastageKg || 0), 0)
  const avgSkip = Math.round(MEAL_ORDER.reduce((s, m) => s + (preds[m]?.skipPct || 0), 0) / MEAL_ORDER.length)

  return (
    <div style={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px' }} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-100">{block.block_name}</span>
          {block.catering_company && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
              {block.catering_company}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">Avg skip</p>
          <p className="text-sm font-bold" style={{ color: skipColor(avgSkip) }}>{avgSkip}%</p>
        </div>
      </div>

      {/* Column labels */}
      <div className="flex items-center px-4 pt-2 pb-1">
        <span className="text-[10px] text-gray-600 flex-1">Meal</span>
        <span className="text-[10px] text-gray-600 w-16 text-center">Skip %</span>
        <span className="text-[10px] text-gray-600 w-16 text-right">Waste kg</span>
      </div>

      {/* Meal rows */}
      {MEAL_ORDER.map((meal) => {
        const p = preds[meal]
        if (!p) return null
        const sc = skipColor(p.skipPct)
        const wc = wasteColor(p.wastageKg)
        return (
          <div key={meal} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 16px' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-gray-400 flex-1">{MEAL_LABEL[meal]}</span>
              {/* Skip */}
              <span className="text-xs font-bold w-16 text-center" style={{ color: sc }}>{p.skipPct}%</span>
              {/* Waste */}
              <span className="text-xs font-bold w-16 text-right" style={{ color: wc }}>{p.wastageKg} kg</span>
            </div>
            {/* Dual progress bars */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-600 w-12">skip</span>
                <div className="flex-1"><Bar value={p.skipPct} max={50} color={sc} /></div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-600 w-12">waste</span>
                <div className="flex-1">
                  <Bar value={p.wastageKg} max={22} color={wc} />
                </div>
                <Sparkline values={[...block.meals[meal].waste_history].reverse()} color={wc} />
              </div>
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '8px 16px' }} className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">Total predicted wastage</span>
        <span className="text-sm font-bold" style={{ color: wasteColor(totalWaste / MEAL_ORDER.length) }}>
          {totalWaste.toFixed(1)} kg
        </span>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function WastagePredictionSection() {
  const [activeTab, setActiveTab] = useState('MH')

  const summary = useMemo(() => {
    let totalWaste = 0
    let skipSum = 0
    let mealCount = 0

    for (const cat of Object.values(HISTORY)) {
      for (const block of cat) {
        const preds = computePredictions(block)
        for (const meal of MEAL_ORDER) {
          const p = preds[meal]
          if (!p) continue
          totalWaste += p.wastageKg
          skipSum    += p.skipPct
          mealCount  += 1
        }
      }
    }
    return {
      totalWaste: totalWaste.toFixed(1),
      avgSkip: Math.round(skipSum / mealCount),
    }
  }, [])

  const blocks = HISTORY[activeTab] || []

  return (
    <section>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-gray-100">Wastage &amp; Non-Consumption Prediction</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
            Weighted avg · 8 wks
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Predicted non-consumption % (from attendance history) and food wastage kg (from bin logs), weighted by recency.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-gray-500">Total predicted wastage today</p>
          <p className="text-2xl font-bold text-gray-100">
            {summary.totalWaste} <span className="text-sm font-medium text-gray-400">kg</span>
          </p>
          <p className="text-[11px] text-gray-600">All blocks · MH + LH · 4 meals</p>
        </div>
        <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-gray-500">Avg non-consumption rate</p>
          <p className="text-2xl font-bold" style={{ color: skipColor(summary.avgSkip) }}>
            {summary.avgSkip}%
          </p>
          <p className="text-[11px] text-gray-600">Students expected not to eat</p>
        </div>
        <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-gray-500 mb-1.5">Legend</p>
          {[['#34d399', 'Low  —  skip &lt;22% · waste &lt;9 kg'], ['#f59e0b', 'Medium  —  skip 22–34% · waste 9–13 kg'], ['#ef4444', 'High  —  skip ≥35% · waste ≥14 kg']].map(([c, t]) => (
            <div key={c} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
              <span className="text-[10px] text-gray-400" dangerouslySetInnerHTML={{ __html: t }} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2.5 text-sm font-medium transition-colors -mb-px"
            style={{
              borderBottom: activeTab === tab.key ? '2px solid #7c3aed' : '2px solid transparent',
              color: activeTab === tab.key ? '#e5e7eb' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Block grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blocks.map((block) => (
          <BlockCard key={block.block_name} block={block} />
        ))}
      </div>

      <p className="text-xs text-gray-700 mt-4 text-center">
        Predictions use exponentially-weighted averages over 8 weeks · Recent weeks count more · Connect live drum logs to replace dummy data
      </p>
    </section>
  )
}
