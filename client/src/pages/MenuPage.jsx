import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAuth } from '../lib/clerk'
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
      className="rounded-2xl animate-pulse overflow-hidden"
      style={{ border: '1px solid #F0E6D3' }}
    >
      <div style={{ height: 120, background: '#F0E6D3' }} />
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {[80, 60, 100, 70].map((w, i) => (
            <div key={i} className="h-6 rounded-full" style={{ width: w, background: '#F5EDE4' }} />
          ))}
        </div>
        <div className="h-10 rounded-2xl" style={{ background: '#F5EDE4' }} />
      </div>
    </div>
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

  const loadedKeysRef = useRef(new Set())

  useEffect(() => {
    if (profileLoading || !blockCategory) return
    let cancelled = false
    const cacheKey = `messloo_menu_${blockCategory}_${selectedDate}_default`

    const load = async () => {
      let hasCache = false
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          setMenus(parsed)
          hasCache = true

          // Also load cached attendance for these menu items if available
          const cachedAttendance = {}
          for (const menu of parsed) {
            const att = localStorage.getItem(`messloo_attendance_${menu.id}`)
            if (att) {
              cachedAttendance[menu.id] = JSON.parse(att)
            }
          }
          setAttendanceMap(cachedAttendance)
        }
      } catch (e) {
        console.error('Failed to load menu cache', e)
      }

      // If already successfully loaded in this session, use cache and skip network request
      if (loadedKeysRef.current.has(cacheKey)) {
        setLoading(false)
        setError(null)
        return
      }

      if (!hasCache) {
        setLoading(true)
      }
      setError(null)

      try {
        const token = await getToken()
        const res = await api.getMenus(token, { date: selectedDate, block_category: blockCategory })
        const menuItems = res?.data || []
        if (cancelled) return

        setMenus(menuItems)

        try {
          localStorage.setItem(cacheKey, JSON.stringify(menuItems))
        } catch (e) {
          console.error('Failed to write menu cache', e)
        }

        loadedKeysRef.current.add(cacheKey)

        if (menuItems.length) {
          const records = await fetchAttendance(menuItems, token)
          if (!cancelled) {
            setAttendanceMap(records)
            for (const menu of menuItems) {
              if (records[menu.id]) {
                try {
                  localStorage.setItem(`messloo_attendance_${menu.id}`, JSON.stringify(records[menu.id]))
                } catch (e) {
                  console.error('Failed to write attendance cache', e)
                }
              }
            }
          }
        } else {
          if (!cancelled) setAttendanceMap({})
        }
      } catch (err) {
        if (cancelled) return
        if (hasCache) {
          console.warn('Network request failed, using cached menu', err)
        } else {
          const isOffline = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          const msg = isOffline 
            ? "You are offline, and this menu hasn't been cached yet. Please connect to the internet to load it."
            : (err.message || 'Failed to load menu')
          setError(msg)
        }
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Cannot mark attendance while offline.')
    }
    const token = await getToken()
    const res = await api.markAttendance(token, body)
    setAttendanceMap((prev) => ({ ...prev, [body.menu_id]: res?.data }))
    if (res?.data) {
      try {
        localStorage.setItem(`messloo_attendance_${body.menu_id}`, JSON.stringify(res.data))
      } catch (e) {
        console.error('Failed to write attendance cache', e)
      }
    }
    return res?.data
  }

  const handleSubmitFeedback = async (body) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const token = await getToken()
    await api.submitFeedback(token, body)
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

        {typeof navigator !== 'undefined' && !navigator.onLine && (
          <div 
            className="mb-4 rounded-2xl p-3 text-xs font-semibold flex items-center gap-2"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#92610A', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
            Offline Mode: Showing cached menu data. Writes are disabled.
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-3 mb-4 text-sm font-medium" style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}>
            {error}
          </div>
        )}

        {/* Meal cards — vertical scrollable list */}
        <div className="flex flex-col gap-4">
          {loading || profileLoading
            ? MEAL_ORDER.map((m) => <SkeletonCard key={m} />)
            : MEAL_ORDER.map((mealType) => {
                const menuItem = menuByMeal[mealType]
                return (
                  <MealCard
                    key={mealType}
                    mealType={mealType}
                    menuItem={menuItem}
                    attendance={menuItem ? attendanceMap[menuItem.id] : null}
                    onMarkAttendance={handleMarkAttendance}
                    onSubmitFeedback={handleSubmitFeedback}
                  />
                )
              })}
        </div>

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
