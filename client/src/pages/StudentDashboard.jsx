import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth, UserButton } from '@clerk/react'
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

const MENU_TYPES = [
  { key: 'veg',     label: 'Veg Mess',     dot: '#16a34a' },
  { key: 'non_veg', label: 'Non-Veg',      dot: '#E23744' },
  { key: 'special', label: 'Special',      dot: '#F59E0B' },
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
  if (h < 9)  return 'breakfast'
  if (h < 13) return 'lunch'
  if (h < 17) return 'snacks'
  if (h < 22) return 'dinner'
  return null
}

function popPendingFeedback() {
  try {
    const stored = JSON.parse(localStorage.getItem('messloo_pending_feedback') || '[]')
    const now = Date.now()
    const due = stored.filter((e) => now - e.markedAt >= 45 * 60 * 1000 && now - e.markedAt <= 18 * 60 * 60 * 1000)
    if (!due.length) return null
    const entry = due[0]
    localStorage.setItem('messloo_pending_feedback', JSON.stringify(stored.filter((e) => e.menuId !== entry.menuId)))
    return entry
  } catch { return null }
}

// ── Post-meal feedback sheet ──────────────────────────────────────────────────
function FeedbackModal({ entry, onClose, onSubmit }) {
  const [stars, setStars] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

  const handleSubmit = async () => {
    if (stars === 0) { onClose(); return }
    setSubmitting(true)
    try { await onSubmit(entry, stars) } finally { onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(15,10,5,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-t-3xl px-6 pt-4 pb-10" style={{ background: '#FFFAF5', borderTop: '1px solid #F0E6D3' }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ background: '#EEE3D6' }} />
        <h2 className="text-lg font-black mb-1" style={{ color: '#1C1C1E' }}>How was {entry.mealLabel}?</h2>
        <p className="text-xs mb-5" style={{ color: '#8B7355' }}>Rate the meal you just had</p>
        <div className="flex gap-2 mb-1">
          {[1,2,3,4,5].map((s) => (
            <button key={s} onClick={() => setStars(s)} className="active:scale-90 transition-transform"
              style={{ fontSize: 38, lineHeight: 1, color: s <= stars ? '#FFB830' : '#EEE3D6' }}>★</button>
          ))}
        </div>
        <p className="text-sm font-semibold mb-5 min-h-5" style={{ color: '#E23744' }}>{LABELS[stars]}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl py-3 text-sm font-semibold" style={{ background: '#F5EDE4', color: '#8B7355' }}>Skip</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-2xl py-3 text-sm font-black active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E23744, #C0392B)', color: '#FFF', boxShadow: '0 4px 14px rgba(226,55,68,0.3)' }}>
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton grid card ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-3xl animate-pulse" style={{ minHeight: 180, background: 'rgba(226,55,68,0.12)' }} />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { profile, blockCategory, blockName, cateringCompany, loading: profileLoading, error: profileError } = useUserContext()
  const [menus, setMenus]           = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [offline, setOffline]       = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const [menuType, setMenuType]     = useState('veg')

  const date     = useMemo(() => todayISO(), [])
  const nextMeal = getNextMeal()

  // ── Cache helpers ──
  const cacheKey = useCallback(
    (bc, mt) => `messloo_menus_${date}_${bc}_${mt}`,
    [date]
  )
  const saveToCache = useCallback((bc, mt, items) => {
    try { localStorage.setItem(cacheKey(bc, mt), JSON.stringify(items)) } catch {}
  }, [cacheKey])
  const loadFromCache = useCallback((bc, mt) => {
    try { return JSON.parse(localStorage.getItem(cacheKey(bc, mt)) || 'null') } catch { return null }
  }, [cacheKey])

  // Save user info to localStorage so OfflineFallback can show it without Clerk
  useEffect(() => {
    if (blockCategory) localStorage.setItem('messloo_user_block', blockCategory)
    if (profile?.name) localStorage.setItem('messloo_user_name', profile.name)
  }, [blockCategory, profile?.name])

  useEffect(() => {
    const entry = popPendingFeedback()
    if (entry) setPendingFeedback(entry)
  }, [])

  const fetchAttendance = useCallback(async (menuItems, token) => {
    const records = {}
    await Promise.all(menuItems.map(async (menu) => {
      try {
        const res = await api.getAttendance(token, { menu_id: menu.id })
        if (res?.data) records[menu.id] = res.data
      } catch {}
    }))
    return records
  }, [])

  useEffect(() => {
    if (profileLoading || !blockCategory) { if (!profileLoading) setLoading(false); return }
    let cancelled = false

    // Load from cache first — show immediately, no skeleton
    const cached = loadFromCache(blockCategory, menuType)
    const hasCache = Boolean(cached?.length)
    if (hasCache) {
      setMenus(cached)
      setOffline(true)   // assume offline until fresh fetch succeeds
      setLoading(false)
    } else {
      setMenus([])
      setLoading(true)   // only show skeleton when there's nothing to show
    }
    setAttendanceMap({})
    setError(null)

    const load = async () => {
      try {
        const token = await getToken()
        // Wrap the API call with a 8-second timeout so offline fails fast
        const res = await Promise.race([
          api.getMenus(token, { date, block_category: blockCategory, menu_type: menuType }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ])
        const menuItems = res?.data || []
        if (cancelled) return
        setMenus(menuItems)
        setOffline(false)
        setError(null)
        saveToCache(blockCategory, menuType, menuItems)
        if (menuItems.length) {
          const records = await fetchAttendance(menuItems, token)
          if (!cancelled) setAttendanceMap(records)
        }
      } catch {
        if (!cancelled) {
          if (hasCache) {
            // Already showing cached data — just keep offline badge, do nothing else
            setOffline(true)
          } else {
            setError('No internet and no cached menu for today.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken, date, blockCategory, menuType, profileLoading, fetchAttendance, loadFromCache, saveToCache])

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

  const handlePostMealFeedback = async (entry, stars) => {
    const token = await getToken()
    await api.submitFeedback(token, {
      menu_id: entry.menuId, meal_date: entry.mealDate, meal_type: entry.mealType,
      category: 'food_quality', description: `Rated ${stars}/5 stars`,
      severity: stars <= 2 ? 'high' : stars === 3 ? 'medium' : 'low',
    }).catch(() => {})
  }

  const formattedDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [date]
  )
  const firstName = profile?.name?.split(' ')[0] || null
  const activeMenuType = MENU_TYPES.find((t) => t.key === menuType)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF4EC' }}>

      {pendingFeedback && (
        <FeedbackModal entry={pendingFeedback} onClose={() => setPendingFeedback(null)} onSubmit={handlePostMealFeedback} />
      )}

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: -120, right: -80, width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(235,51,73,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: 80, left: -100, width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,151,30,0.16) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 180, right: -60, width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,94,98,0.13) 0%, transparent 70%)',
        }} />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-5 pt-12 pb-3 max-w-lg mx-auto w-full">
        {/* Top row: greeting + avatar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#B08040' }}>
              {getGreeting()}
            </p>
            <h1 className="text-2xl font-black mt-0.5 tracking-tight" style={{ color: '#1C1C1E' }}>
              {firstName ?? 'MessLoo'}
            </h1>
            {blockName && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E23744' }} />
                <span className="text-xs font-semibold" style={{ color: '#8B7355' }}>
                  {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
                </span>
              </div>
            )}
          </div>
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10' } }} />
        </div>

        {/* Next meal pill */}
        {nextMeal && (
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{ background: 'rgba(235,51,73,0.1)', color: '#E23744', border: '1px solid rgba(235,51,73,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E23744' }} />
              Next · {nextMeal.charAt(0).toUpperCase() + nextMeal.slice(1)} · {MEAL_TIMES[nextMeal]}
            </span>
          </div>
        )}

        {/* Menu type toggle (pill bar) */}
        <div className="flex gap-2 mb-1">
          {MENU_TYPES.map(({ key, label, dot }) => {
            const active = menuType === key
            return (
              <button
                key={key}
                type="button"
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

      {/* ── Section header ── */}
      <div className="relative z-10 px-5 pb-2 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black" style={{ color: '#1C1C1E' }}>
            Today's Menu
            <span className="ml-2 text-xs font-semibold" style={{ color: '#B08040' }}>
              {activeMenuType?.label}
            </span>
          </h2>
          {offline && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(247,151,30,0.15)', color: '#D97706', border: '1px solid rgba(247,151,30,0.3)' }}
            >
              Cached
            </span>
          )}
        </div>
      </div>

      {/* ── Errors ── */}
      {(profileError || error) && (
        <div className="relative z-10 mx-5 max-w-lg mb-3 rounded-2xl p-3 text-sm font-medium"
          style={{ background: 'rgba(226,55,68,0.08)', color: '#E23744', border: '1px solid rgba(226,55,68,0.2)' }}>
          {profileError || error}
        </div>
      )}

      {/* ── 2-column meal grid ── */}
      <main className="relative z-10 flex-1 px-5 pb-28 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3 mt-2">
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
              })
          }
        </div>

        {/* Chat CTA card */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 2px 16px rgba(180,80,40,0.08)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
            style={{ background: 'linear-gradient(135deg, #F7971E, #FFD200)', color: '#3D2C1E' }}
          >
            AI
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: '#1C1C1E' }}>Ask Mess AI</p>
            <p className="text-xs" style={{ color: '#8B7355' }}>What's for dinner? Any specials today?</p>
          </div>
          <span className="ml-auto text-lg font-light" style={{ color: '#E2B89A' }}>›</span>
        </button>
      </main>

      <BottomTabBar />
    </div>
  )
}
