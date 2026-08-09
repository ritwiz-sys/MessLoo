import { useState, useMemo } from 'react'
import MealCard from '../components/MealCard'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
const MENU_TYPES = [
  { key: 'veg',     label: 'Veg Mess',  dot: '#16a34a' },
  { key: 'non_veg', label: 'Non-Veg',   dot: '#E23744' },
  { key: 'special', label: 'Special',   dot: '#F59E0B' },
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

export default function OfflineFallback() {
  const date = useMemo(() => todayISO(), [])

  // Read saved user info from localStorage (saved when online)
  const savedBlock = localStorage.getItem('messloo_user_block') || ''
  const savedName  = localStorage.getItem('messloo_user_name') || ''
  const firstName  = savedName.split(' ')[0] || 'Student'

  const [menuType, setMenuType] = useState('veg')

  // Load cached menus for today
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

  const activeMenuType = MENU_TYPES.find((t) => t.key === menuType)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF4EC' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(235,51,73,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: 80, left: -100, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(247,151,30,0.16) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#B08040' }}>
              {getGreeting()}
            </p>
            <h1 className="text-2xl font-black mt-0.5 tracking-tight" style={{ color: '#1C1C1E' }}>
              {firstName}
            </h1>
            {savedBlock && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E23744' }} />
                <span className="text-xs font-semibold" style={{ color: '#8B7355' }}>{savedBlock}</span>
              </div>
            )}
          </div>

          {/* Offline badge */}
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(247,151,30,0.15)', color: '#D97706', border: '1px solid rgba(247,151,30,0.4)' }}
          >
            Offline
          </span>
        </div>

        {/* Menu type toggle */}
        <div className="flex gap-2 mb-1">
          {MENU_TYPES.map(({ key, label, dot }) => {
            const active = menuType === key
            return (
              <button
                key={key}
                onClick={() => setMenuType(key)}
                className="rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95"
                style={active
                  ? { background: '#1C1C1E', color: '#FFF', boxShadow: '0 4px 12px rgba(28,28,30,0.25)' }
                  : { background: 'rgba(255,255,255,0.75)', color: '#8B7355', border: '1px solid rgba(240,230,211,0.8)' }
                }
              >
                {active && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot, verticalAlign: 'middle' }} />}
                {label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Section header */}
      <div className="relative z-10 px-5 pb-2 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black" style={{ color: '#1C1C1E' }}>
            Today's Menu
            <span className="ml-2 text-xs font-semibold" style={{ color: '#B08040' }}>{activeMenuType?.label}</span>
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(247,151,30,0.15)', color: '#D97706', border: '1px solid rgba(247,151,30,0.3)' }}>
            Cached
          </span>
        </div>
      </div>

      {/* Meal grid */}
      <main className="relative z-10 flex-1 px-5 pb-28 max-w-lg mx-auto w-full">
        {menus.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-sm font-semibold" style={{ color: '#8B7355' }}>
              No cached menu available.
            </p>
            <p className="text-xs mt-1" style={{ color: '#B0956E' }}>
              Open the app once online to cache today's menu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {MEAL_ORDER.map((mealType) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                menuItem={menuByMeal[mealType]}
                attendance={null}
                onMarkAttendance={async () => {}}
                onSubmitFeedback={async () => {}}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: '#C4A882' }}>
          You're offline. Connect to mark attendance or submit feedback.
        </p>
      </main>
    </div>
  )
}
