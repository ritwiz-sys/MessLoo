import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import { clearSession } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
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

function shiftDate(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
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

// ── Calendar Strip (full-month, scrollable, with month navigation) ─────────────
function CalendarStrip({ selectedDate, onSelect }) {
  const today = todayISO()

  const [viewYM, setViewYM] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number)
    return { year: y, month: m }
  })

  const stripRef = useRef(null)
  const selectedRef = useRef(null)

  // All days in the viewed month
  const days = useMemo(() => {
    const { year, month } = viewYM
    const count = new Date(year, month, 0).getDate()
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    })
  }, [viewYM])

  // Scroll selected day into view whenever view changes
  useEffect(() => {
    requestAnimationFrame(() => {
      if (selectedRef.current && stripRef.current) {
        const strip = stripRef.current
        const el = selectedRef.current
        strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
      }
    })
  }, [viewYM, days])

  const monthLabel = new Date(viewYM.year, viewYM.month - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const isCurrentMonth = (() => {
    const [ty, tm] = today.split('-').map(Number)
    return viewYM.year === ty && viewYM.month === tm
  })()

  const prevMonth = () => setViewYM(({ year, month }) =>
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  )
  const nextMonth = () => setViewYM(({ year, month }) =>
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  )
  const jumpToday = () => {
    const [y, m] = today.split('-').map(Number)
    setViewYM({ year: y, month: m })
    onSelect(today)
  }

  const handleSelect = (iso) => {
    const [y, m] = iso.split('-').map(Number)
    setViewYM({ year: y, month: m })
    onSelect(iso)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: 'none',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Month navigation row */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: 'var(--toggle-bg)',
            color: 'var(--text-muted)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>
            {monthLabel}
          </span>
          {!isCurrentMonth && (
            <button
              onClick={jumpToday}
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all active:scale-95"
              style={{
                background: 'rgba(226,55,68,0.15)',
                color: '#E23744',
                border: '1px solid rgba(226,55,68,0.25)',
              }}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: 'var(--toggle-bg)',
            color: 'var(--text-muted)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day scrollable tape */}
      <div
        ref={stripRef}
        className="flex gap-1.5 overflow-x-auto px-3 pb-3"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
        {days.map((iso) => {
          const { letter, num } = parseDateParts(iso)
          const isToday   = iso === today
          const isSelected = iso === selectedDate
          return (
            <button
              key={iso}
              ref={isSelected ? selectedRef : null}
              onClick={() => handleSelect(iso)}
              className="flex flex-col items-center shrink-0 rounded-2xl transition-all active:scale-90"
              style={{
                width: 42,
                paddingTop: 8,
                paddingBottom: 8,
                background: isSelected
                  ? 'linear-gradient(160deg, #E23744 0%, #C0392B 100%)'
                  : isToday
                  ? 'rgba(226,55,68,0.08)'
                  : 'transparent',
                border: isToday && !isSelected
                  ? '1.5px solid rgba(226,55,68,0.35)'
                  : isSelected
                  ? 'none'
                  : '1.5px solid transparent',
                boxShadow: isSelected ? '0 4px 14px rgba(226,55,68,0.32)' : 'none',
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}
              >
                {letter}
              </span>
              <span
                className="font-extrabold leading-none"
                style={{
                  fontSize: 15,
                  color: isSelected ? '#fff' : isToday ? '#E23744' : 'var(--text-primary)',
                }}
              >
                {num}
              </span>
              {isToday && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: '#E23744' }} />
              )}
            </button>
          )
        })}
      </div>
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
          top: 4, bottom: 4,
          left: `calc(4px + ${idx} * (100% - 8px) / ${n})`,
          width: `calc((100% - 8px) / ${n})`,
          background: 'linear-gradient(135deg, #FFB830, #E6A000)',
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
            position: 'relative', zIndex: 1,
            padding: '9px 8px',
            borderRadius: 100,
            fontSize: 13, fontWeight: 700,
            color: value === o.key ? '#1a1200' : 'var(--seg-inactive-text)',
            transition: 'color 0.22s',
            background: 'none', border: 'none', cursor: 'pointer',
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
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
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
        height: 88, borderRadius: 20,
        background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--toggle-bg) 50%, var(--card-bg) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: 'var(--card-border)',
        opacity: 0.6,
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

function DashboardAiChat({ onClose }) {
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
      const res = await api.askChat(q)
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
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid var(--modal-border)',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
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
        <div style={{ height: 1, background: 'var(--dish-border)', margin: '0 20px' }} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
          {thinking && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Chips */}
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

        {/* Input */}
        <div
          className="px-5 shrink-0"
          style={{ paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 88px))' }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <input
              type="text"
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about today's menu…"
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--text-primary)', fontSize: 16 }}
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
  const navigate = useNavigate()
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
  const [showCalendar, setShowCalendar]       = useState(false)
  const [showMenu, setShowMenu]               = useState(false)

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

  useEffect(() => {
    if (blockCategory) localStorage.setItem('messloo_user_block', blockCategory)
    if (profile?.name) localStorage.setItem('messloo_user_name', profile.name)
  }, [blockCategory, profile?.name])

  useEffect(() => {
    const entry = popPendingFeedback()
    if (entry) setPendingFeedback(entry)
  }, [])

  const fetchAttendance = useCallback(async (menuItems) => {
    const records = {}
    await Promise.all(menuItems.map(async (menu) => {
      try {
        const res = await api.getAttendance({ menu_id: menu.id })
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
        const res = await Promise.race([
          api.getMenus({ date: selectedDate, block_category: blockCategory, menu_type: menuType }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ])
        const menuItems = res?.data || []
        if (cancelled) return
        setMenus(menuItems)
        setOffline(false)
        setError(null)
        saveToCache(blockCategory, menuType, menuItems)
        if (menuItems.length) {
          const records = await fetchAttendance(menuItems)
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
  }, [selectedDate, blockCategory, menuType, profileLoading, fetchAttendance, loadFromCache, saveToCache])

  const menuByMeal = useMemo(() => {
    const map = {}
    for (const item of menus) map[item.meal_type] = item
    return map
  }, [menus])

  const handleMarkAttendance = async (body) => {
    const res = await api.markAttendance(body)
    setAttendanceMap((prev) => ({ ...prev, [body.menu_id]: res?.data }))
    return res?.data
  }

  const handleSubmitFeedback = async (body) => {
    await api.submitFeedback(body)
  }

  const handlePostMealFeedback = async (entry, stars) => {
    await api.submitFeedback({
      menu_id: entry.menuId, meal_date: entry.mealDate, meal_type: entry.mealType,
      category: 'food_quality', description: `Rated ${stars}/5 stars`,
      severity: stars <= 2 ? 'high' : stars === 3 ? 'medium' : 'low',
    }).catch(() => {})
  }

  const firstName = profile?.name?.split(' ')[0] || null

  // Formatted date for section title
  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short',
    })
  }, [selectedDate])

  return (
    <div className="min-h-screen" style={{ background: 'transparent', overflowX: 'hidden' }}>

      {pendingFeedback && (
        <FeedbackModal
          entry={pendingFeedback}
          onClose={() => setPendingFeedback(null)}
          onSubmit={handlePostMealFeedback}
        />
      )}

      {showAiChat && (
        <DashboardAiChat onClose={() => setShowAiChat(false)} />
      )}

      {/* ── Hamburger menu overlay ── */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute max-w-lg left-0 right-0 mx-auto"
            style={{ top: 'max(84px, calc(env(safe-area-inset-top, 0px) + 70px))', padding: '0 20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(14,14,20,0.98)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              {blockName && (
                <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: 'rgba(255,184,48,0.12)', color: '#FFB830', border: '1px solid rgba(255,184,48,0.2)' }}
                  >
                    {blockName[0]}
                  </div>
                  <div>
                    <p className="font-black text-[14px]" style={{ color: 'rgba(255,255,255,0.92)' }}>Block {blockName}</p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>VIT-AP Hostel Mess</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { toggleTheme(); setShowMenu(false) }}
                className="w-full flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'transparent' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </span>
              </button>
              <button
                onClick={() => { clearSession(); navigate('/login', { replace: true }) }}
                className="w-full flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ background: 'transparent' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🚪</span>
                <span className="text-[13px] font-semibold" style={{ color: '#E23744' }}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-30 w-full"
        style={{
          background: 'rgba(13,13,17,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,184,48,0.08)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 max-w-lg mx-auto"
          style={{
            paddingTop: 'max(46px, calc(env(safe-area-inset-top, 0px) + 12px))',
            paddingBottom: 12,
          }}
        >
          {/* Menu icon — bento grid */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="0" y="0" width="7" height="7" rx="2" fill="rgba(255,255,255,0.75)" />
              <rect x="9" y="0" width="7" height="7" rx="2" fill="#FFB830" />
              <rect x="0" y="9" width="7" height="7" rx="2" fill="rgba(255,255,255,0.75)" />
              <rect x="9" y="9" width="7" height="7" rx="2" fill="rgba(255,255,255,0.35)" />
            </svg>
          </button>

          {/* Brand */}
          <div className="text-center select-none">
            <p style={{ fontSize: 17, fontWeight: 900, color: '#FFB830', letterSpacing: '0.22em', lineHeight: 1.1 }}>
              MESSLOO
            </p>
            <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 1 }}>
              VIT – AP MESS
            </p>
          </div>

          {/* Avatar */}
          <div className="flex items-center">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center font-black transition-all active:scale-90"
              style={{
                background: 'linear-gradient(135deg, #FFB830 0%, #E6A000 100%)',
                color: '#2a1a00',
                fontSize: 15,
                boxShadow: '0 3px 12px rgba(255,184,48,0.45)',
              }}
            >
              {(blockName || firstName || 'M')[0].toUpperCase()}
            </button>
          </div>
        </div>

        {offline && (
          <div
            className="text-center py-1.5 text-[10px] font-bold tracking-widest uppercase"
            style={{ background: 'rgba(255,184,48,0.07)', color: 'rgba(255,184,48,0.8)', borderTop: '1px solid rgba(255,184,48,0.12)' }}
          >
            ⚡ Cached menu · Pull to refresh
          </div>
        )}
      </div>

      {/* ── Date navigation ── */}
      <div className="px-5 pt-4 pb-2 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,184,48,0.65)' }}>
              {isToday ? '● Today' : '▷ Viewing'}
            </p>
            <h2
              className="font-black leading-tight mt-0.5 truncate"
              style={{ fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {formattedSelectedDate}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: showCalendar ? 'rgba(255,184,48,0.14)' : 'var(--toggle-bg)',
                border: showCalendar ? '1px solid rgba(255,184,48,0.35)' : 'var(--card-border)',
                color: showCalendar ? '#FFB830' : 'var(--text-muted)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
                <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8.5" cy="14" r="1.3" fill="currentColor" />
                <circle cx="12" cy="14" r="1.3" fill="currentColor" />
                <circle cx="15.5" cy="14" r="1.3" fill="currentColor" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'var(--toggle-bg)', border: 'var(--card-border)', color: 'var(--text-muted)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'var(--toggle-bg)', border: 'var(--card-border)', color: 'var(--text-muted)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {!isToday && (
              <button
                onClick={() => { setSelectedDate(today); setShowCalendar(false) }}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
                style={{ background: 'rgba(255,184,48,0.12)', color: '#FFB830', border: '1px solid rgba(255,184,48,0.25)' }}
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Collapsible calendar strip */}
        {showCalendar && (
          <div className="mt-3">
            <CalendarStrip
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setShowCalendar(false) }}
            />
          </div>
        )}

        {/* Info pills */}
        {(blockName || (nextMeal && isToday)) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {blockName && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                style={{
                  background: 'rgba(255,184,48,0.08)',
                  color: '#FFB830',
                  border: '1px solid rgba(255,184,48,0.18)',
                }}
              >
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </span>
            )}
            {nextMeal && isToday && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                style={{
                  background: 'rgba(226,55,68,0.08)',
                  color: '#E23744',
                  border: '1px solid rgba(226,55,68,0.2)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: '#E23744' }} />
                {MEAL_LABELS[nextMeal]} · {MEAL_TIMES[nextMeal]}
              </span>
            )}
          </div>
        )}

        {/* Segmented control */}
        <div className="mt-3">
          <SegmentedControl value={menuType} onChange={setMenuType} options={MENU_TYPES} />
        </div>
      </div>

      {/* ── Error banners ── */}
      {(profileError || error) && (
        <div
          className="mx-5 max-w-lg mb-2 rounded-2xl p-3 text-sm font-medium"
          style={{
            background: 'var(--error-bg)',
            color: 'var(--error-color)',
            border: '1px solid var(--error-border)',
          }}
        >
          {profileError || error}
        </div>
      )}

      {/* ── Meal cards (2×2 grid) ── */}
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
                    offline={offline}
                    isActive={isToday && mt === nextMeal}
                  />
                )
              })
          }

          {/* ── Ask Mess AI banner (full width) ── */}
          <button
            type="button"
            onClick={() => setShowAiChat(true)}
            className="w-full text-left transition-all active:scale-[0.98] relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 60%, #7C3AED 100%)',
              borderRadius: 20,
              padding: '20px 20px 20px 22px',
              minHeight: 110,
              boxShadow: '0 8px 32px rgba(99,58,237,0.40), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <div style={{
              position: 'absolute', top: -24, right: 64, width: 110, height: 110,
              borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -30, right: 20, width: 90, height: 90,
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
            }} />

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
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              }}>
                Ask Now
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#4F46E5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 72, lineHeight: 1,
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.25))',
              userSelect: 'none', pointerEvents: 'none', zIndex: 1,
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
