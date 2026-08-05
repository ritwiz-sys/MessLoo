import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth, UserButton } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import MealCard from '../components/MealCard'
import BottomTabBar from '../components/BottomTabBar'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
const MEAL_EMOJI = { breakfast: '☀️', lunch: '🍛', snacks: '🫖', dinner: '🌙' }
const MEAL_TIMES = {
  breakfast: '7:30 – 9:00 AM',
  lunch: '12:00 – 2:00 PM',
  snacks: '4:00 – 5:30 PM',
  dinner: '7:00 – 9:30 PM',
}

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

// ── Read + clear pending feedback from localStorage ───────────────────────────
function popPendingFeedback() {
  try {
    const stored = JSON.parse(localStorage.getItem('messloo_pending_feedback') || '[]')
    const now = Date.now()
    const MIN_WAIT = 45 * 60 * 1000   // 45 min — meal should be over
    const MAX_AGE  = 18 * 60 * 60 * 1000 // 18 hr — not too stale

    const due = stored.filter(
      (e) => now - e.markedAt >= MIN_WAIT && now - e.markedAt <= MAX_AGE
    )
    if (due.length === 0) return null

    // Return the oldest due entry and remove it from storage
    const entry = due[0]
    const remaining = stored.filter((e) => e.menuId !== entry.menuId)
    localStorage.setItem('messloo_pending_feedback', JSON.stringify(remaining))
    return entry
  } catch { return null }
}

// ── Recent-meal feedback modal ────────────────────────────────────────────────
function FeedbackModal({ entry, onClose, onSubmit }) {
  const [stars, setStars] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (stars === 0) { onClose(); return }
    setSubmitting(true)
    try {
      await onSubmit(entry, stars)
    } finally {
      onClose()
    }
  }

  const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(28,28,30,0.55)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-6 pb-10"
        style={{ background: '#FFFFFF', border: '1px solid #F0E6D3' }}
      >
        {/* Pill handle */}
        <div className="mx-auto w-10 h-1.5 rounded-full mb-5" style={{ background: '#F0E6D3' }} />

        <div className="text-center mb-5">
          <span className="text-5xl block mb-3">{MEAL_EMOJI[entry.mealType] || '🍽️'}</span>
          <h2 className="text-lg font-extrabold" style={{ color: '#1C1C1E' }}>
            How was {entry.mealLabel}?
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
            Rate the meal you just had
          </p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-3 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              className="transition-transform active:scale-95"
              style={{ fontSize: 40, lineHeight: 1, color: s <= stars ? '#FFB830' : '#E8DDD0' }}
            >
              ★
            </button>
          ))}
        </div>
        {stars > 0 && (
          <p className="text-center text-sm font-semibold mb-4" style={{ color: '#E23744' }}>
            {STAR_LABELS[stars]}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold"
            style={{ background: '#F5EDE4', color: '#6B6B6B' }}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(226,55,68,0.3)' }}
          >
            {submitting ? 'Submitting…' : stars === 0 ? 'Skip' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
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

  const handleSubmitFeedback = async (body) => {
    const token = await getToken()
    await api.submitFeedback(token, body)
  }

  const formattedDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [date]
  )

  const firstName = profile?.name?.split(' ')[0] || null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF8F0' }}>
      {/* ── Header ── */}
      <header
        className="px-4 pt-10 pb-4"
        style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 100%)' }}
      >
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: '#6B6B6B' }}>{getGreeting()} 👋</p>
            <h1 className="text-2xl font-extrabold mt-0.5" style={{ color: '#1C1C1E' }}>
              {firstName ?? 'MessLoo'}
            </h1>
            {blockName && (
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: '#FFE8EA', color: '#E23744' }}
              >
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </div>
            )}
          </div>
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10' } }} />
        </div>

        <div className="max-w-lg mx-auto mt-2">
          <p className="text-xs font-medium" style={{ color: '#6B6B6B' }}>{formattedDate}</p>
        </div>

        {/* Next meal banner */}
        {nextMeal && (
          <div
            className="max-w-lg mx-auto mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: '#E23744', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
          >
            <div>
              <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Coming up next</p>
              <p className="text-base font-extrabold text-white capitalize mt-0.5">
                {MEAL_EMOJI[nextMeal]} {nextMeal.charAt(0).toUpperCase() + nextMeal.slice(1)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-white">{MEAL_TIMES[nextMeal]}</p>
              <button
                onClick={() => navigate('/menu')}
                className="text-xs font-bold mt-1 underline underline-offset-2"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                See full menu
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Meal list ── */}
      <main className="flex-1 px-4 pt-4 pb-28 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#1C1C1E' }}>Today's Menu</h2>
          <button onClick={() => navigate('/menu')} className="text-xs font-semibold" style={{ color: '#E23744' }}>
            Browse week →
          </button>
        </div>

        {(profileError || error) && (
          <div
            className="rounded-2xl p-3 mb-4 text-sm font-medium"
            style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}
          >
            {profileError || error}
          </div>
        )}

        {/* Vertical meal list */}
        <div className="flex flex-col gap-4">
          {profileLoading || loading
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

        {/* Chat CTA */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-95"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 12px rgba(226,55,68,0.07)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: '#FFE8EA' }}
          >
            💬
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>Ask the Mess AI</p>
            <p className="text-xs" style={{ color: '#6B6B6B' }}>What's for dinner? Any specials?</p>
          </div>
          <span className="ml-auto text-xl" style={{ color: '#F0E6D3' }}>›</span>
        </button>
      </main>

      <BottomTabBar />
    </div>
  )
}
