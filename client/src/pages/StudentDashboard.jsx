import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import TopBar from '../components/TopBar'
import MealCard from '../components/MealCard'
import ChatSection from '../components/ChatSection'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export default function StudentDashboard() {
  const { getToken } = useAuth()
  const { profile, blockCategory, blockName, cateringCompany, loading: profileLoading, error: profileError } = useUserContext()
  const stableGetToken = useCallback(getToken, [])
  const [menus, setMenus] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({}) // { menu_id: attendance_record }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const date = useMemo(() => todayISO(), [])

  // Looks up, per menu, whether this student already has an attendance
  // row for it — this is what lets a marked meal stay disabled across reloads.
  const fetchAttendance = async (menuItems, token) => {
    const records = {}
    await Promise.all(
      menuItems.map(async (menu) => {
        try {
          const res = await api.getAttendance(token, { menu_id: menu.id })
          if (res?.data) {
            records[menu.id] = res.data
          }
        } catch {
          // no record yet for this menu — leave it unmarked
        }
      }),
    )
    return records
  }

  useEffect(() => {
    if (profileLoading) return

    if (!blockCategory) {
      setLoading(false)
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
        } else {
          setAttendanceMap({})
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load today\'s menu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [getToken, date, blockCategory, profileLoading])

  const menuByMeal = useMemo(() => {
    const map = {}
    for (const item of menus) {
      map[item.meal_type] = item
    }
    return map
  }, [menus])

  const handleMarkAttendance = async (body) => {
    const token = await getToken()
    const res = await api.markAttendance(token, body)
    // Optimistically store the new record so the card flips to "marked"
    // immediately, without needing a refetch.
    setAttendanceMap((prev) => ({ ...prev, [body.menu_id]: res?.data }))
    return res?.data
  }

  const formattedDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [date],
  )

  return (
    <div className="min-h-screen bg-[#0b0b10]">
      <TopBar
        title={profile?.name ? `Hi, ${profile.name.split(' ')[0]}` : 'MessLoo'}
        subtitle={
          blockCategory
            ? `${blockName || blockCategory}${cateringCompany ? ` · ${cateringCompany}` : ''} · ${formattedDate}`
            : formattedDate
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-100">Today's Menu</h1>
          <p className="text-sm text-gray-500">Mark whether you're eating, and rate the meal once you're done.</p>
        </div>

        {profileError && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4 mb-6">
            {profileError}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4 mb-6">
            {error}
          </div>
        )}

        {profileLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MEAL_ORDER.map((m) => (
              <div key={m} className="h-44 rounded-2xl border border-white/5 bg-[#15151c] animate-pulse" />
            ))}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MEAL_ORDER.map((m) => (
              <div key={m} className="h-44 rounded-2xl border border-white/5 bg-[#15151c] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <ChatSection />
      </main>
    </div>
  )
}
