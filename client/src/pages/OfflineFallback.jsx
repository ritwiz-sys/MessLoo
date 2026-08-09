import { useMemo, useState } from 'react'
import MealCard from '../components/MealCard'
import BottomTabBar from '../components/BottomTabBar'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

const MENU_TYPES = [
  { key: 'veg',     label: 'Veg'     },
  { key: 'non_veg', label: 'Non-Veg' },
  { key: 'special', label: 'Special' },
]

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Same segmented control as StudentDashboard
function SegmentedControl({ value, onChange, options }) {
  const n = options.length
  const idx = options.findIndex((o) => o.key === value)
  return (
    <div
      className="relative flex"
      style={{
        background: 'var(--seg-bg)',
        border: 'var(--seg-border)',
        borderRadius: 100,
        padding: 4,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4, bottom: 4,
          left: `calc(4px + ${idx} * (100% - 8px) / ${n})`,
          width: `calc((100% - 8px) / ${n})`,
          background: 'var(--seg-active-bg)',
          borderRadius: 100,
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}
      />
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          style={{
            flex: 1,
            position: 'relative',
            zIndex: 1,
            padding: '9px 8px',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            color: value === o.key ? 'var(--seg-active-text)' : 'var(--seg-inactive-text)',
            transition: 'color 0.22s',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function OfflineFallback() {
  const date      = useMemo(() => todayISO(), [])
  const savedBlock = localStorage.getItem('messloo_user_block') || ''
  const savedName  = localStorage.getItem('messloo_user_name') || ''
  const firstName  = savedName.split(' ')[0] || null

  const [menuType, setMenuType] = useState('veg')

  const menus = useMemo(() => {
    try {
      const key = `messloo_menus_${date}_${savedBlock}_${menuType}`
      return JSON.parse(localStorage.getItem(key) || 'null') || []
    } catch { return [] }
  }, [date, savedBlock, menuType])

  const menuByMeal = useMemo(() => {
    const map = {}
    for (const item of menus) map[item.meal_type] = item
    return map
  }, [menus])

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>

      {/* ── Header — identical to StudentDashboard ── */}
      <header className="px-5 pb-3 max-w-lg mx-auto w-full" style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top, 0px) + 16px))' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-bold tracking-[0.14em] uppercase"
              style={{ color: 'var(--greeting-color)' }}
            >
              {getGreeting()}
            </p>
            <h1
              className="mt-0.5 leading-none truncate"
              style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {firstName ?? 'MessLoo'}
            </h1>
          </div>
        </div>

        {savedBlock && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                border: 'var(--card-border)',
                color: 'var(--text-secondary)',
              }}
            >
              🏠 {savedBlock}
            </span>
          </div>
        )}

        <div className="mt-4">
          <SegmentedControl value={menuType} onChange={setMenuType} options={MENU_TYPES} />
        </div>
      </header>

      {/* ── Section title ── */}
      <div className="px-5 pb-2 max-w-lg mx-auto w-full">
        <h2 className="text-[15px] font-black" style={{ color: 'var(--text-primary)' }}>
          Today&#39;s Menu
        </h2>
      </div>

      {/* ── Meal cards — single column, same as online ── */}
      <main className="px-5 pb-28 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-3 mt-1">
          {menus.length === 0 && MEAL_ORDER.map((mt) => (
            <MealCard
              key={mt}
              mealType={mt}
              menuItem={null}
              attendance={null}
              onMarkAttendance={async () => {}}
              onSubmitFeedback={async () => {}}
            />
          ))}
          {menus.length > 0 && MEAL_ORDER.map((mt) => (
            <MealCard
              key={mt}
              mealType={mt}
              menuItem={menuByMeal[mt]}
              attendance={null}
              onMarkAttendance={async () => {}}
              onSubmitFeedback={async () => {}}
            />
          ))}
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
