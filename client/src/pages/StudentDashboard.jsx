import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAuth, UserButton } from '@clerk/react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import { useTheme } from '../hooks/useTheme'
import MealCard from '../components/MealCard'
import BottomTabBar from '../components/BottomTabBar'

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

const MEAL_TIMES = {
  breakfast: '7:30 – 9:00 AM',
  lunch: '12:00 – 2:00 PM',
  snacks: '4:00 – 5:30 PM',
  dinner: '7:00 – 9:30 PM',
}

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Evening Snacks',
  dinner: 'Dinner',
}

const MENU_TYPES = [
  { key: 'veg',     label: 'Veg'      },
  { key: 'non_veg', label: 'Non-Veg'  },
]

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function offsetISO(days) {
  const now = new Date()
  now.setDate(now.getDate() + days)
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function getWeekDays() {
  return [-3, -2, -1, 0, 1, 2, 3].map((d) => offsetISO(d))
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function parseDateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return { letter: DAY_LETTERS[dt.getDay()], num: d }
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

// ── Week Strip ────────────────────────────────────────────────────────────────
function WeekStrip({ selectedDate, onSelect }) {
  const days = getWeekDays()
  const today = todayISO()
  const stripRef = useRef(null)
  const todayRef = useRef(null)

  // Auto-scroll today into view on mount
  useEffect(() => {
    if (todayRef.current && stripRef.current) {
      const strip = stripRef.current
      const el = todayRef.current
      const offset = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2
      strip.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [])

  return (
    <div
      ref={stripRef}
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      <style>{`.week-strip::-webkit-scrollbar{display:none}`}</style>
      {days.map((iso) => {
        const { letter, num } = parseDateParts(iso)
        const isToday = iso === today
        const isSelected = iso === selectedDate
        return (
          <button
            key={iso}
            ref={isToday ? todayRef : null}
            onClick={() => onSelect(iso)}
            className="flex flex-col items-center shrink-0 rounded-2xl transition-all active:scale-90"
            style={{
              width: 44,
              paddingTop: 10,
              paddingBottom: 10,
              background: isSelected
                ? '#E23744'
                : isToday
                ? 'var(--card-bg)'
                : 'transparent',
              border: isToday && !isSelected
                ? '1.5px solid #E23744'
                : isSelected
                ? 'none'
                : '1.5px solid transparent',
              boxShadow: isSelected ? '0 4px 14px rgba(226,55,68,0.30)' : 'none',
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
            >
              {letter}
            </span>
            <span
              className="text-base font-extrabold leading-none"
              style={{ color: isSelected ? '#fff' : isToday ? '#E23744' : 'var(--text-primary)' }}
            >
              {num}
            </span>
            {isToday && !isSelected && (
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5"
                style={{ background: '#E23744' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Segmented Control ─────────────────────────────────────────────────────────
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
      {/* Sliding active pill */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
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

// ── Post-meal feedback modal ───────────────────────────────────────────────────
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-4 pb-10"
        style={{
          background: 'var(--modal-bg)',
          borderTop: '1px solid var(--modal-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ background: 'var(--handle-color)' }} />
        <h2 className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          How was {entry.mealLabel}?
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Rate the meal you just had</p>
        <div className="flex gap-2 mb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              className="active:scale-90 transition-transform"
              style={{ fontSize: 38, lineHeight: 1, color: s <= stars ? '#FFB830' : 'var(--handle-color)' }}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold mb-5 min-h-5" style={{ color: 'var(--error-color)' }}>
          {LABELS[stars]}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold"
            style={{ background: 'var(--toggle-bg)', color: 'var(--skip-color)' }}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl py-3 text-sm font-black active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E23744, #C0392B)',
              color: '#FFF',
              boxShadow: '0 4px 14px rgba(226,55,68,0.3)',
            }}
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="w-full animate-pulse"
      style={{
        height: 88,
        borderRadius: 20,
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: 'var(--card-border)',
        opacity: 0.5,
      }}
    />
  )
}

// ── Dashboard AI Chat (bottom sheet) ─────────────────────────────────────────
const AI_CHIPS = [
  "What's for lunch?",
  'Any specials today?',
  'Which block has better food?',
  'What time does dinner end?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl"
      style={{ background: 'var(--dish-odd)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6, width: 'fit-content' }}>
      {[0, 150, 300].map((d) => (
        <span key={d} className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: 'var(--text-muted)', animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? { background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#FFF', borderBottomRightRadius: 6, boxShadow: '0 2px 10px rgba(124,58,237,0.25)' }
            : { background: 'var(--dish-odd)', color: 'var(--dish-text)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6 }
        }
      >
        {content}
      </div>
    </div>
  )
}

function DashboardAiChat({ onClose, getToken }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey! 👋 Ask me anything about the mess — menu, timings, specials, or which block has better food!' },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (question) => {
    const q = (question || input).trim()
    if (!q || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setThinking(true)
    try {
      const token = await getToken()
      const res = await api.askChat(token, q)
      setMessages((m) => [...m, { role: 'assistant', content: res?.answer || res?.reply || "I couldn't get a response. Try again!" }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Mess AI is offline right now. Try again in a moment!' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg mx-auto flex flex-col"
        style={{
          maxHeight: '88vh',
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--modal-border)',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.15)" />
                <circle cx="9.5" cy="9.5" r="1.2" fill="white" />
                <circle cx="14.5" cy="9.5" r="1.2" fill="white" />
                <path d="M9 14.5c0 0 .8 1.5 3 1.5s3-1.5 3-1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 2v1.5M12 20.5V22M2 12h1.5M20.5 12H22" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-black leading-tight" style={{ color: 'var(--text-primary)' }}>Mess AI</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Ask anything about your mess</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'var(--toggle-bg)', color: 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--dish-border)', margin: '0 20px' }} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
          {thinking && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips (only on first open) */}
        {messages.length <= 1 && !thinking && (
          <div className="px-5 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {AI_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{ background: 'var(--pill-bg)', color: 'var(--pill-color)', border: '1px solid var(--pill-border)', whiteSpace: 'nowrap' }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Input bar — padded above floating pill nav */}
        <div
          className="px-5 shrink-0"
          style={{ paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 88px))' }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
          >
            <input
              type="text"
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about today's menu…"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', boxShadow: '0 3px 10px rgba(124,58,237,0.35)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { getToken } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const {
    profile, blockCategory, blockName, cateringCompany,
    loading: profileLoading, error: profileError,
  } = useUserContext()

  const [menus, setMenus]                     = useState([])
  const [attendanceMap, setAttendanceMap]     = useState({})
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)
  const [offline, setOffline]                 = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const [menuType, setMenuType]               = useState('veg')
  const [showAiChat, setShowAiChat]           = useState(false)
  const [selectedDate, setSelectedDate]       = useState(() => todayISO())

  const today    = useMemo(() => todayISO(), [])
  const nextMeal = getNextMeal()
  const isToday  = selectedDate === today

  // ── Cache helpers ──────────────────────────────────────────────────────────
  const cacheKey = useCallback(
    (bc, mt) => `messloo_menus_${selectedDate}_${bc}_${mt}`,
    [selectedDate]
  )
  const saveToCache = useCallback((bc, mt, items) => {
    try { localStorage.setItem(cacheKey(bc, mt), JSON.stringify(items)) } catch {}
  }, [cacheKey])
  const loadFromCache = useCallback((bc, mt) => {
    try { return JSON.parse(localStorage.getItem(cacheKey(bc, mt)) || 'null') } catch { return null }
  }, [cacheKey])

  // Save user info for offline fallback
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

    const cached = loadFromCache(blockCategory, menuType)
    const hasCache = Boolean(cached?.length)
    if (hasCache) {
      setMenus(cached)
      setOffline(true)
      setLoading(false)
    } else {
      setMenus([])
      setLoading(true)
    }
    setAttendanceMap({})
    setError(null)

    const load = async () => {
      try {
        const token = await getToken()
        const res = await Promise.race([
          api.getMenus(token, { date: selectedDate, block_category: blockCategory, menu_type: menuType }),
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
            setOffline(true)
          } else {
            setError('No internet and no cached menu for this date.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken, selectedDate, blockCategory, menuType, profileLoading, fetchAttendance, loadFromCache, saveToCache])

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

  const firstName = profile?.name?.split(' ')[0] || null

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>

      {pendingFeedback && (
        <FeedbackModal
          entry={pendingFeedback}
          onClose={() => setPendingFeedback(null)}
          onSubmit={handlePostMealFeedback}
        />
      )}

      {showAiChat && (
        <DashboardAiChat onClose={() => setShowAiChat(false)} getToken={getToken} />
      )}

      {/* ── Header ── */}
      <header className="px-5 pb-3 max-w-lg mx-auto w-full" style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top, 0px) + 16px))' }}>

        {/* Top row: greeting/name | controls */}
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

          {/* Theme toggle + avatar */}
          <div className="flex items-center gap-2 ml-3 mt-0.5">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: 'var(--toggle-bg)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: 'var(--card-border)',
                fontSize: 17,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9' } }} />
          </div>
        </div>

        {/* Block + next meal pills */}
        {(blockName || nextMeal) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {blockName && (
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
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </span>
            )}
            {nextMeal && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                style={{
                  background: 'var(--pill-bg)',
                  color: 'var(--pill-color)',
                  border: `1px solid var(--pill-border)`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--pill-color)' }}
                />
                {MEAL_LABELS[nextMeal]} · {MEAL_TIMES[nextMeal]}
              </span>
            )}
          </div>
        )}

        {/* Week strip */}
        <div className="mt-4">
          <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        {/* Segmented control */}
        <div className="mt-3">
          <SegmentedControl value={menuType} onChange={setMenuType} options={MENU_TYPES} />
        </div>
      </header>

      {/* ── Section title ── */}
      <div className="px-5 pb-2 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-black" style={{ color: 'var(--text-primary)' }}>
            {isToday
              ? "Today's Menu"
              : new Date(...selectedDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
            }
          </h2>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-[11px] font-bold px-3 py-1 rounded-full transition-all active:scale-95"
              style={{ background: 'var(--card-bg)', color: '#E23744', border: '1px solid rgba(226,55,68,0.3)' }}
            >
              Back to Today
            </button>
          )}
        </div>
      </div>

      {/* ── Error banners ── */}
      {(profileError || error) && (
        <div
          className="mx-5 max-w-lg mb-3 rounded-2xl p-3 text-sm font-medium"
          style={{
            background: 'var(--error-bg)',
            color: 'var(--error-color)',
            border: `1px solid var(--error-border)`,
          }}
        >
          {profileError || error}
        </div>
      )}

      {/* ── Meal cards (single column) ── */}
      <main className="px-5 pb-28 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-3 mt-1">
          {profileLoading || loading
            ? MEAL_ORDER.map((m) => <SkeletonCard key={m} />)
            : MEAL_ORDER.map((mt) => {
                const menuItem = menuByMeal[mt]
                return (
                  <MealCard
                    key={mt}
                    mealType={mt}
                    menuItem={menuItem}
                    attendance={menuItem ? attendanceMap[menuItem.id] : null}
                    onMarkAttendance={handleMarkAttendance}
                    onSubmitFeedback={handleSubmitFeedback}
                    getToken={getToken}
                    offline={offline}
                  />
                )
              })
          }

          {/* ── Ask Mess AI banner card ── */}
          <button
            type="button"
            onClick={() => setShowAiChat(true)}
            className="w-full text-left transition-all active:scale-[0.98] relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 60%, #7C3AED 100%)',
              borderRadius: 20,
              padding: '20px 20px 20px 22px',
              minHeight: 110,
              boxShadow: '0 8px 28px rgba(99,58,237,0.38)',
            }}
          >
            {/* Subtle background circles for depth */}
            <div style={{
              position: 'absolute', top: -24, right: 64, width: 110, height: 110,
              borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -30, right: 20, width: 90, height: 90,
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
            }} />

            {/* Left: text + CTA */}
            <div style={{ maxWidth: '62%', position: 'relative', zIndex: 1 }}>
              <p style={{
                fontSize: 17, fontWeight: 900, color: '#FFFFFF',
                lineHeight: 1.25, letterSpacing: '-0.01em', marginBottom: 6,
              }}>
                Something Fresh Every Meal 🍽️
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 14, lineHeight: 1.4 }}>
                Ask me about today's menu, specials, timings, and more.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#FFFFFF', borderRadius: 100,
                padding: '6px 14px',
                fontSize: 12, fontWeight: 800, color: '#4F46E5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                Ask Now
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#4F46E5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Right: floating emoji illustration */}
            <div style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 72, lineHeight: 1,
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.25))',
              userSelect: 'none', pointerEvents: 'none',
              zIndex: 1,
            }}>
              🤖
            </div>
          </button>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
