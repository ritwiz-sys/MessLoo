import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useAuth, UserButton } from '../lib/clerk'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import MealCard from '../components/MealCard'
import BottomTabBar from '../components/BottomTabBar'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

const MEAL_TIMES = {
  breakfast: '7:30 – 9:00 AM',
  lunch: '12:00 – 2:00 PM',
  snacks: '4:00 – 5:30 PM',
  dinner: '7:00 – 9:30 PM',
}

const MEAL_ACCENT = {
  breakfast: '#F59E0B',
  lunch: '#E23744',
  snacks: '#D97706',
  dinner: '#7C3AED',
}

const MENU_TYPES = [
  { key: 'veg',     label: 'Veg Mess',     color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)'   },
  { key: 'non_veg', label: 'Non-Veg Mess', color: '#E23744', bg: 'rgba(226,55,68,0.1)',   border: 'rgba(226,55,68,0.3)'   },
  { key: 'special', label: 'Special Mess', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
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
    const MIN_WAIT = 45 * 60 * 1000
    const MAX_AGE  = 18 * 60 * 60 * 1000
    const due = stored.filter((e) => now - e.markedAt >= MIN_WAIT && now - e.markedAt <= MAX_AGE)
    if (due.length === 0) return null
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
  const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

  const handleSubmit = async () => {
    if (stars === 0) { onClose(); return }
    setSubmitting(true)
    try { await onSubmit(entry, stars) } finally { onClose() }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-4 pb-10"
        style={{
          background: 'rgba(255,252,246,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(245,158,11,0.2)',
        }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ background: '#F0E6D3' }} />
        <div className="text-center mb-5">
          <h2 className="text-lg font-extrabold" style={{ color: '#1C1C1E' }}>
            How was {entry.mealLabel}?
          </h2>
          <p className="text-sm mt-1" style={{ color: '#8B7355' }}>Rate the meal you just had</p>
        </div>
        <div className="flex justify-center gap-3 mb-2">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              className="transition-transform active:scale-95"
              style={{ fontSize: 40, lineHeight: 1, color: s <= stars ? '#F59E0B' : '#E8DDD0' }}
            >★</button>
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
            style={{ background: '#F5EDE4', color: '#8B7355' }}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E23744, #C0392B)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(226,55,68,0.3)',
            }}
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
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 2px 12px rgba(180,120,40,0.06)',
      }}
    >
      <div style={{ height: 64, background: 'rgba(240,230,211,0.5)' }} />
      <div className="p-4">
        <div className="flex flex-col gap-2 mb-4">
          {[100, 140, 80].map((w, i) => (
            <div key={i} className="h-5 rounded-lg" style={{ width: w, background: 'rgba(240,230,211,0.7)' }} />
          ))}
        </div>
        <div className="h-10 rounded-xl" style={{ background: 'rgba(240,230,211,0.5)' }} />
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
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const [menuType, setMenuType] = useState('veg')

  const date = useMemo(() => todayISO(), [])
  const nextMeal = getNextMeal()

  // Check for pending post-meal feedback on mount
  useEffect(() => {
    const entry = popPendingFeedback()
    if (entry) setPendingFeedback(entry)
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
    if (profileLoading || !blockCategory) {
      if (!profileLoading) setLoading(false)
      return
    }
    let cancelled = false
    const cacheKey = `messloo_menu_${blockCategory}_${date}_${menuType}`

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
        const res = await api.getMenus(token, { date, block_category: blockCategory, menu_type: menuType })
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
            ? `You are offline, and the ${MENU_TYPES.find(m => m.key === menuType)?.label || menuType} menu hasn't been cached yet. Please connect to the internet to load it.`
            : (err.message || "Failed to load today's menu")
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [getToken, date, blockCategory, menuType, profileLoading, fetchAttendance])

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

  const handlePostMealFeedback = async (entry, stars) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const token = await getToken()
    await api.submitFeedback(token, {
      menu_id: entry.menuId,
      meal_date: entry.mealDate,
      meal_type: entry.mealType,
      category: 'food_quality',
      description: `Rated ${stars}/5 stars`,
      severity: stars <= 2 ? 'high' : stars === 3 ? 'medium' : 'low',
    }).catch(() => {})
  }

  const formattedDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [date]
  )

  const firstName = profile?.name?.split(' ')[0] || null

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #FFF8EE 0%, #FEF3C7 35%, #FFECD2 70%, #FFF8EE 100%)',
      }}
    >
      {/* ── Pending feedback modal ── */}
      {pendingFeedback && (
        <FeedbackModal
          entry={pendingFeedback}
          onClose={() => setPendingFeedback(null)}
          onSubmit={handlePostMealFeedback}
        />
      )}

      {/* ── Header ── */}
      <header className="px-5 pt-12 pb-5">
        <div className="max-w-lg mx-auto">
          {/* Top row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#B08040' }}>
                {getGreeting()}
              </p>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1C1C1E' }}>
                {firstName ?? 'MessLoo'}
              </h1>
              <p className="text-xs font-medium mt-1" style={{ color: '#8B7355' }}>{formattedDate}</p>
            </div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10' } }} />
          </div>

          {/* Block badge */}
          {blockName && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{
                background: 'rgba(245,158,11,0.12)',
                color: '#92610A',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#F59E0B' }}
              />
              {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
            </div>
          )}

          {/* Next meal pill */}
          {nextMeal && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-1"
              style={{
                background: `${MEAL_ACCENT[nextMeal]}14`,
                color: MEAL_ACCENT[nextMeal],
                border: `1px solid ${MEAL_ACCENT[nextMeal]}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: MEAL_ACCENT[nextMeal] }} />
              Next: {nextMeal.charAt(0).toUpperCase() + nextMeal.slice(1)} · {MEAL_TIMES[nextMeal]}
            </div>
          )}
        </div>
      </header>

      {/* ── Meal list ── */}
      <main className="flex-1 px-5 pt-2 pb-28 max-w-lg mx-auto w-full">
        {/* Section header */}
        <div className="mb-4">
          <h2 className="text-base font-extrabold mb-3" style={{ color: '#1C1C1E' }}>Today's Menu</h2>

          {/* ── Menu type toggle ── */}
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.9)',
            }}
          >
            {MENU_TYPES.map(({ key, label, color, bg, border }) => {
              const active = menuType === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMenuType(key)}
                  className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                  style={
                    active
                      ? { background: bg, color, border: `1px solid ${border}`, boxShadow: `0 2px 8px ${color}20` }
                      : { background: 'transparent', color: '#8B7355', border: '1px solid transparent' }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
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

        {(profileError || error) && (
          <div
            className="rounded-2xl p-3 mb-4 text-sm font-medium"
            style={{ background: 'rgba(226,55,68,0.08)', color: '#E23744', border: '1px solid rgba(226,55,68,0.2)' }}
          >
            {profileError || error}
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-col gap-3.5">
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
          onClick={typeof navigator !== 'undefined' && !navigator.onLine ? null : () => navigate('/chat')}
          disabled={typeof navigator !== 'undefined' && !navigator.onLine}
          className="w-full mt-5 flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 2px 16px rgba(180,120,40,0.08)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92610A' }}
          >
            AI
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>Ask Mess AI</p>
            <p className="text-xs" style={{ color: '#8B7355' }}>
              {typeof navigator !== 'undefined' && !navigator.onLine ? "AI Chat is offline" : "What's for dinner? Any specials today?"}
            </p>
          </div>
          <span className="ml-auto text-lg font-light" style={{ color: '#C8B89A' }}>›</span>
        </button>
      </main>

      <BottomTabBar />
    </div>
  )
}
