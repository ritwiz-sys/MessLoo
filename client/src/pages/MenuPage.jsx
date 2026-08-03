import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import MealCard from '../components/MealCard'
import BottomTabBar from '../components/BottomTabBar'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function formatISO(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

// Build a 14-day window: 3 days before today → 10 days after
function buildWeek() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []
  for (let i = -3; i <= 10; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 animate-pulse"
      style={{ background: '#F5EDE4', border: '1px solid #F0E6D3', minHeight: 100 }}
    />
  )
}

export default function MenuPage() {
  const { getToken } = useAuth()
  const { blockCategory, loading: profileLoading } = useUserContext()

  const today = useMemo(() => todayISO(), [])
  const days = useMemo(() => buildWeek(), [])
  const [selectedDate, setSelectedDate] = useState(today)

  const [menus, setMenus] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)

  // Scroll active date pill into view on mount
  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]')
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }, [])

  const fetchAttendance = useCallback(async (menuItems, token) => {
    const records = {}
    await Promise.all(
      menuItems.map(async (menu) => {
        try {
          const res = await api.getAttendance(token, { menu_id: menu.id })
          if (res?.data) records[menu.id] = res.data
        } catch { /* no record yet */ }
      })
    )
    return records
  }, [])

  useEffect(() => {
    if (profileLoading || !blockCategory) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        const res = await api.getMenus(token, { date: selectedDate, block_category: blockCategory })
        const menuItems = res?.data || []
        if (cancelled) return
        setMenus(menuItems)
        if (menuItems.length) {
          const records = await fetchAttendance(menuItems, token)
          if (!cancelled) setAttendanceMap(records)
        } else {
          setAttendanceMap({})
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load menu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken, selectedDate, blockCategory, profileLoading, fetchAttendance])

  const menuByMeal = useMemo(() => {
    const map = {}
    for (const item of menus) map[item.meal_type] = item
    return map
  }, [menus])

  const handleMarkAttendance = async (body) => {
    const token = await getToken()
    const res = await api.markAttendance(token, body)
    setAttendanceMap((prev) => ({ ...prev, [body.menu_id]: res?.data }))
    return res?.data
  }

  const formattedSelected = useMemo(
    () => new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [selectedDate]
  )

  const isPast = selectedDate < today
  const isFuture = selectedDate > today

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF8F0' }}>
      {/* ── Header ── */}
      <header className="px-4 pt-10 pb-4 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-extrabold" style={{ color: '#1C1C1E' }}>Menu</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B6B6B' }}>Browse the week and mark your meals</p>
      </header>

      {/* ── Date pill scroller ── */}
      <div className="px-4 max-w-lg mx-auto w-full">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto no-scrollbar pb-2"
        >
          {days.map((day) => {
            const iso = formatISO(day)
            const isToday = iso === today
            const isSelected = iso === selectedDate
            return (
              <button
                key={iso}
                data-active={isSelected}
                onClick={() => setSelectedDate(iso)}
                className="flex flex-col items-center gap-0.5 shrink-0 px-3 py-2 rounded-2xl transition-all active:scale-95"
                style={{
                  background: isSelected ? '#E23744' : isToday ? '#FFF0F1' : '#FFFFFF',
                  border: isSelected ? '2px solid #E23744' : isToday ? '2px solid #FCCFD2' : '1px solid #F0E6D3',
                  minWidth: 52,
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : '#6B6B6B' }}
                >
                  {DAY_SHORT[day.getDay()]}
                </span>
                <span
                  className="text-base font-extrabold"
                  style={{ color: isSelected ? '#FFFFFF' : isToday ? '#E23744' : '#1C1C1E' }}
                >
                  {day.getDate()}
                </span>
                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E23744' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 px-4 pt-4 pb-28 max-w-lg mx-auto w-full">
        {/* Date header */}
        <div className="mb-4">
          <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{formattedSelected}</p>
          {isPast && (
            <span className="text-xs font-medium" style={{ color: '#6B6B6B' }}>Past day</span>
          )}
          {isFuture && (
            <span className="text-xs font-medium" style={{ color: '#6B6B6B' }}>Upcoming</span>
          )}
        </div>

        {error && (
          <div className="rounded-2xl p-3 mb-4 text-sm font-medium" style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}>
            {error}
          </div>
        )}

        {/* Meal cards */}
        {loading || profileLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {MEAL_ORDER.map((m) => <SkeletonCard key={m} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {MEAL_ORDER.map((mealType) => {
              const menuItem = menuByMeal[mealType]
              return (
                <MealCard
                  key={mealType}
                  mealType={mealType}
                  menuItem={menuItem}
                  attendance={menuItem ? attendanceMap[menuItem.id] : null}
                  onMarkAttendance={handleMarkAttendance}
                />
              )
            })}
          </div>
        )}

        {/* No menu empty state */}
        {!loading && !profileLoading && menus.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🍽️</span>
            <p className="text-base font-bold" style={{ color: '#1C1C1E' }}>No menu posted</p>
            <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
              {isFuture ? "Check back closer to the date." : "Menu hasn't been posted for this day."}
            </p>
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
