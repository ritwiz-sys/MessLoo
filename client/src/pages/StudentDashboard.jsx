import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth, UserButton } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getNextMeal() {
  const h = new Date().getHours()
  if (h < 9) return 'breakfast'
  if (h < 13) return 'lunch'
  if (h < 17) return 'snacks'
  if (h < 22) return 'dinner'
  return null
}

const MEAL_TIMES = {
  breakfast: '7:30 – 9:00 AM',
  lunch: '12:00 – 2:00 PM',
  snacks: '4:00 – 5:30 PM',
  dinner: '7:00 – 9:30 PM',
}

const MEAL_EMOJI = { breakfast: '🌅', lunch: '🍛', snacks: '🍪', dinner: '🌙' }

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 animate-pulse"
      style={{ background: '#F5EDE4', border: '1px solid #F0E6D3', minHeight: 120 }}
    />
  )
}

export default function StudentDashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { profile, blockCategory, blockName, cateringCompany, loading: profileLoading, error: profileError } = useUserContext()
  const [menus, setMenus] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const date = useMemo(() => todayISO(), [])
  const nextMeal = getNextMeal()

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
    if (profileLoading || !blockCategory) {
      if (!profileLoading) setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        const res = await api.getMenus(token, { date, block_category: blockCategory })
        const menuItems = res?.data || []
        if (cancelled) return
        setMenus(menuItems)
        if (menuItems.length) {
          const records = await fetchAttendance(menuItems, token)
          if (!cancelled) setAttendanceMap(records)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load today's menu")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken, date, blockCategory, profileLoading, fetchAttendance])

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

  const formattedDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [date]
  )

  const firstName = profile?.name?.split(' ')[0] || null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF8F0' }}>
      {/* ── Top header ── */}
      <header
        className="px-4 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 100%)' }}
      >
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: '#6B6B6B' }}>{getGreeting()} 👋</p>
            <h1 className="text-2xl font-extrabold mt-0.5" style={{ color: '#1C1C1E' }}>
              {firstName ? firstName : 'MessLoo'}
            </h1>
            {/* Block pill */}
            {blockName && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#FFE8EA', color: '#E23744' }}>
                <span>🏠</span>
                <span>{blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}</span>
              </div>
            )}
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-10 h-10',
              },
            }}
          />
        </div>

        {/* Date strip */}
        <div className="max-w-lg mx-auto mt-3">
          <p className="text-xs font-medium" style={{ color: '#6B6B6B' }}>{formattedDate}</p>
        </div>

        {/* Next meal banner */}
        {nextMeal && (
          <div
            className="max-w-lg mx-auto mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: '#E23744', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Next meal</p>
              <p className="text-sm font-bold text-white capitalize">{MEAL_EMOJI[nextMeal]} {nextMeal}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-white">{MEAL_TIMES[nextMeal]}</p>
              <button
                onClick={() => navigate('/menu')}
                className="text-xs font-bold mt-0.5"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                See menu →
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-4 pt-4 pb-28 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#1C1C1E' }}>Today's Menu</h2>
          <button
            onClick={() => navigate('/menu')}
            className="text-xs font-semibold"
            style={{ color: '#E23744' }}
          >
            See all →
          </button>
        </div>

        {(profileError || error) && (
          <div className="rounded-2xl p-3 mb-4 text-sm font-medium" style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}>
            {profileError || error}
          </div>
        )}

        {/* 2×2 meal grid */}
        {profileLoading || loading ? (
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

        {/* Quick chat CTA */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-95"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 8px rgba(226,55,68,0.06)' }}
        >
          <span className="text-xl">💬</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>Ask the mess AI</p>
            <p className="text-xs" style={{ color: '#6B6B6B' }}>What's for dinner? Any specials this week?</p>
          </div>
          <span className="ml-auto text-lg" style={{ color: '#F0E6D3' }}>›</span>
        </button>
      </main>

      <BottomTabBar />
    </div>
  )
}
