import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import FlipCard from './FlipCard'
import './MealCard.css'

// ── Meal config ───────────────────────────────────────────────────────────────
const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast',
    emoji: '☀️',
    time: '7:30 – 9:00 AM',
    gradient: 'linear-gradient(145deg, #FF9966 0%, #FF5E62 100%)',
    shadowColor: 'rgba(255,94,98,0.55)',
    glowColor: 'rgba(255,94,98,0.42)',
    dotColor: '#FF7A7A',
    accentHex: '#FF5E62',
    foodImage: '/breakfast.jpg',
    foodEmoji: '🥣',
    // Best crop position for each photo
    imgPosition: 'center 30%',
  },
  lunch: {
    label: 'Lunch',
    emoji: '🍛',
    time: '12:00 – 2:00 PM',
    gradient: 'linear-gradient(145deg, #EB3349 0%, #F45C43 100%)',
    shadowColor: 'rgba(235,51,73,0.55)',
    glowColor: 'rgba(235,51,73,0.42)',
    dotColor: '#EB3349',
    accentHex: '#EB3349',
    foodImage: '/lunch.jpg',
    foodEmoji: '🍛',
    imgPosition: 'center 45%',
  },
  snacks: {
    label: 'Evening Snacks',
    emoji: '🧆',
    time: '4:00 – 5:30 PM',
    gradient: 'linear-gradient(145deg, #F7971E 0%, #FFD200 100%)',
    shadowColor: 'rgba(247,151,30,0.55)',
    glowColor: 'rgba(247,151,30,0.42)',
    dotColor: '#F7971E',
    accentHex: '#F7971E',
    foodImage: '/snacks.jpg',
    foodEmoji: '🧆',
    imgPosition: 'center 40%',
  },
  dinner: {
    label: 'Dinner',
    emoji: '🌙',
    time: '7:00 – 9:30 PM',
    gradient: 'linear-gradient(145deg, #C94B4B 0%, #8B0000 100%)',
    shadowColor: 'rgba(201,75,75,0.55)',
    glowColor: 'rgba(139,0,0,0.5)',
    dotColor: '#C94B4B',
    accentHex: '#C94B4B',
    foodImage: '/dinner.jpg',
    foodEmoji: '🫓',
    imgPosition: 'center 55%',
  },
}

// ── Dish parser ───────────────────────────────────────────────────────────────
function parseDishes(str) {
  if (!str) return []
  if (Array.isArray(str)) return str.map((s) => String(s).trim()).filter(Boolean)
  return str.split(/[,;|\/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Food photo ────────────────────────────────────────────────────────────────
function FoodPhoto({ cfg }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, opacity: 0.28, background: cfg.gradient,
      }}>
        {cfg.foodEmoji}
      </div>
    )
  }
  return (
    <img
      src={cfg.foodImage}
      alt=""
      className="meal-front-img"
      onError={() => setErrored(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: cfg.imgPosition,
        display: 'block',
        filter: 'saturate(1.1) contrast(1.02)',
      }}
    />
  )
}

// ── FRONT face ────────────────────────────────────────────────────────────────
function CardFront({ cfg, isSpecial, isActive, marked, hasMenu }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* 1. Photo */}
      <FoodPhoto cfg={cfg} />

      {/* Minimal bottom scrim — just enough to read the text */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, transparent 65%)',
      }} />

      {/* ── TOP ROW: badges ── */}
      <div style={{
        position: 'absolute', top: 10, left: 12, right: 12,
        display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {isSpecial && (
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 100,
            background: '#FCD34D', color: '#3D2C1E', letterSpacing: '0.05em',
            boxShadow: '0 2px 6px rgba(252,211,77,0.4)',
          }}>✨ SPECIAL</span>
        )}
        {marked && (
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 100,
            background: 'rgba(34,197,94,0.28)', color: '#86efac',
            border: '1px solid rgba(34,197,94,0.4)',
            backdropFilter: 'blur(8px)',
          }}>✓ EATING</span>
        )}
      </div>

      {/* ── BOTTOM: frosted glass info bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 14px 14px',
        // extra linear from bottom so text is always legible
        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.32) 70%, transparent 100%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        {/* Left: meal name + time */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <p style={{
              fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1,
              margin: 0, letterSpacing: '-0.02em',
              textShadow: '0 1px 8px rgba(0,0,0,0.45)',
            }}>
              {cfg.label}
            </p>
            {isActive && (
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 100,
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 5,
                letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <span className="meal-now-dot" style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
                  display: 'inline-block', flexShrink: 0,
                }} />
                NOW
              </span>
            )}
          </div>
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0,
            fontWeight: 600, letterSpacing: '0.01em',
          }}>
            {cfg.emoji}&nbsp; {cfg.time}
          </p>
        </div>

        {/* Right: flip hint — only when has menu */}
        {hasMenu && (
          <div className="meal-flip-hint">
            SEE MENU
            <svg className="meal-flip-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

// ── BACK face ─────────────────────────────────────────────────────────────────
function CardBack({ cfg, dishes, marked, hasMenu, onMarkClick }) {
  return (
    <div
      className="meal-back-face"
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: 20, overflow: 'hidden',
      }}
    >
      {/* Accent strip */}
      <div style={{ height: 3, background: cfg.gradient, flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 7px', flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: cfg.gradient,
          boxShadow: `0 3px 12px ${cfg.shadowColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>
          {cfg.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
            {cfg.label}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
            {cfg.time}
          </p>
        </div>
        {marked && (
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 100,
            background: 'rgba(34,197,94,0.12)', color: '#16a34a',
            border: '1px solid rgba(34,197,94,0.28)', flexShrink: 0,
          }}>✓ EATING</span>
        )}
      </div>

      {/* Dish list — scrollable, takes remaining space */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1, overflowY: 'auto', padding: '0 11px 6px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {!hasMenu ? (
          <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)', padding: '8px 3px' }}>
            Menu not posted yet
          </p>
        ) : dishes.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 3px' }}>No dishes listed</p>
        ) : (
          <div style={{ borderRadius: 13, overflow: 'hidden', border: '1px solid var(--dish-border)' }}>
            {dishes.map((dish, i) => (
              <div
                key={i}
                className="meal-dish-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 11px',
                  background: i % 2 === 0 ? 'var(--dish-odd)' : 'var(--dish-even)',
                  borderBottom: i < dishes.length - 1 ? '1px solid var(--dish-border)' : 'none',
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: cfg.dotColor, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--dish-text)', lineHeight: 1.35,
                }}>
                  {dish}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA button */}
      {hasMenu && (
        <div style={{ padding: '5px 11px 11px', flexShrink: 0 }}>
          <button
            className="meal-cta-btn"
            onTouchEnd={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onMarkClick() }}
            disabled={marked}
            style={{
              width: '100%',
              minHeight: 44,           /* touch target */
              padding: '10px 0',
              borderRadius: 13,
              border: 'none',
              background: marked ? 'var(--dish-odd)' : cfg.gradient,
              color: marked ? 'var(--text-muted)' : '#fff',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.06em',
              cursor: marked ? 'default' : 'pointer',
              boxShadow: marked ? 'none' : `0 5px 18px ${cfg.shadowColor}`,
            }}
          >
            {marked ? '✓ ATTENDANCE MARKED' : "I'LL EAT THIS  →"}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl" style={{ background: 'var(--dish-odd)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6, width: 'fit-content' }}>
      {[0, 150, 300].map((d) => (
        <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={isUser
          ? { background: 'linear-gradient(135deg,#E23744,#C0392B)', color: '#FFF', borderBottomRightRadius: 6, boxShadow: '0 2px 10px rgba(226,55,68,0.25)' }
          : { background: 'var(--dish-odd)', color: 'var(--dish-text)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6 }}
      >
        {content}
      </div>
    </div>
  )
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
const CHIPS = ['Is this healthy?', 'Calories estimate?', 'Any allergens?']

function AiChat({ cfg, dishes }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I can answer anything about today's ${cfg.label} — ingredients, nutrition, alternatives, or anything else. 🍽️` },
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
      const ctx = dishes.length ? `[Context: Today's ${cfg.label} includes: ${dishes.join(', ')}] ` : `[Context: Today's ${cfg.label}] `
      const res = await api.askChat(ctx + q)
      setMessages((m) => [...m, { role: 'assistant', content: res?.answer || res?.reply || "Sorry, I couldn't get a response." }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Couldn't reach Mess AI right now. Try again!" }])
    } finally { setThinking(false) }
  }

  return (
    <div className="flex flex-col" style={{ height: 320 }}>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {thinking && <TypingDots />}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && !thinking && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => send(c)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'var(--pill-bg)', color: 'var(--pill-color)', border: '1px solid var(--pill-border)', whiteSpace: 'nowrap' }}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3 mx-4 mb-3 rounded-2xl"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about this meal…"
          className="flex-1 bg-transparent outline-none"
          style={{ color: 'var(--text-primary)', fontSize: 16 }} />
        <button onClick={() => send()} disabled={!input.trim() || thinking}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
          style={{ background: cfg.gradient, boxShadow: `0 3px 10px ${cfg.shadowColor}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Details tab ───────────────────────────────────────────────────────────────
const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

function DetailsTab({ cfg, dishes, onConfirm, onSkip, submitting }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div className="overflow-y-auto px-5 pb-5" style={{ maxHeight: 440 }}>
      {dishes.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--dish-border)' }}>
          {dishes.map((dish, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"
              style={{
                background: i % 2 === 0 ? 'var(--dish-odd)' : 'var(--dish-even)',
                borderBottom: i < dishes.length - 1 ? '1px solid var(--dish-border)' : 'none',
              }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dotColor }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dish-text)' }}>{dish}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Rate this meal</p>
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map((s) => (
          <button key={s} onClick={() => setStars(s === stars ? 0 : s)}
            className="transition-transform active:scale-90"
            style={{ fontSize: 34, lineHeight: 1, color: s <= stars ? '#FFB830' : 'var(--handle-color)' }}>★</button>
        ))}
      </div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--error-color)', minHeight: 20 }}>{STAR_LABELS[stars]}</p>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments? (optional)" rows={2}
        className="w-full resize-none rounded-2xl px-4 py-3 outline-none mb-4"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', fontSize: 16 }} />
      <button onClick={() => onConfirm(stars, comment.trim())} disabled={submitting}
        className="w-full rounded-2xl py-3.5 text-sm font-black tracking-wide transition-all active:scale-95 disabled:opacity-50 mb-2"
        style={{ background: cfg.gradient, color: '#FFF', boxShadow: `0 6px 20px ${cfg.shadowColor}` }}>
        {submitting ? 'Saving…' : stars === 0 ? "I'LL EAT THIS" : 'SUBMIT & MARK EATING'}
      </button>
      <button onClick={onSkip} disabled={submitting}
        className="w-full text-center text-sm py-1.5 disabled:opacity-40"
        style={{ color: 'var(--skip-color)' }}>
        Skip rating, just mark attendance
      </button>
    </div>
  )
}

// ── Popup modal ───────────────────────────────────────────────────────────────
function MealPopup({ cfg, dishes, onConfirm, onSkip, onClose, submitting }) {
  const [tab, setTab] = useState('details')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
    >
      <div className="w-full" style={{
        maxWidth: 440,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--modal-border)',
        borderRadius: '28px 28px 0 0',
        overflow: 'hidden',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.28)',
      }}
      >
        {/* top drag handle — mobile feel */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: 'var(--handle-color)' }} />
        </div>

        <div style={{ height: 3, background: cfg.gradient }} />

        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: cfg.gradient, boxShadow: `0 4px 12px ${cfg.shadowColor}` }}>
              {cfg.emoji}
            </div>
            <div>
              <p className="text-base font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{cfg.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cfg.time}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'var(--toggle-bg)', color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex mx-5 mb-3 rounded-2xl p-1" style={{ background: 'var(--seg-bg)', border: 'var(--seg-border)' }}>
          {[{ key: 'details', label: '📋  Details' }, { key: 'ai', label: '✨  Ask AI' }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all"
              style={tab === key
                ? { background: 'var(--seg-active-bg)', color: 'var(--seg-active-text)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                : { color: 'var(--seg-inactive-text)', background: 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'details'
          ? <DetailsTab cfg={cfg} dishes={dishes} onConfirm={onConfirm} onSkip={onSkip} submitting={submitting} />
          : <AiChat cfg={cfg} dishes={dishes} />}

        {/* Safe area bottom padding */}
        <div style={{ height: 'env(safe-area-inset-bottom)', minHeight: 4 }} />
      </div>
    </div>
  )
}

// ── MealCard (main) ───────────────────────────────────────────────────────────
export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance, onSubmitFeedback, offline, isActive }) {
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // ── Controlled flip state — we own this so touch events are handled reliably ──
  const [isFlipped, setIsFlipped] = useState(false)

  // Measure container width so FlipCard fills it exactly
  const wrapRef = useRef(null)
  const [cardWidth, setCardWidth] = useState(360)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setCardWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(el)
    setCardWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const cfg = MEAL_CONFIG[mealType] || MEAL_CONFIG.dinner
  const hasMenu = Boolean(menuItem)
  const isSpecial = menuItem?.is_special
  const marked = Boolean(attendance)
  const dishes = parseDishes(menuItem?.items)

  // ── Touch-safe flip toggle ─────────────────────────────────────────────────
  // Track touch start position so we only flip on a genuine tap (< 8px movement)
  const touchStart = useRef(null)

  const handleTouchStart = (e) => {
    if (!hasMenu) return
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e) => {
    if (!hasMenu || !touchStart.current) return
    const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x)
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y)
    touchStart.current = null
    // Only flip if finger barely moved (tap, not scroll)
    if (dx < 10 && dy < 10) {
      e.preventDefault()
      setIsFlipped(f => !f)
    }
  }

  // Desktop click fallback (fires after touch events on mobile but we've already handled it)
  const handleClick = (e) => {
    // On touch devices touchEnd handles it; on mouse devices we use click
    if (e.pointerType === 'touch') return
    if (!hasMenu) return
    setIsFlipped(f => !f)
  }

  const doConfirm = async (stars, comment) => {
    setSubmitting(true); setError(null)
    try {
      await onMarkAttendance({ menu_id: menuItem.id, ate: true, rating: stars || null })
      if (onSubmitFeedback && (stars > 0 || comment)) {
        const desc = [stars > 0 ? `Rated ${stars}/5 stars` : null, comment || null].filter(Boolean).join(' — ')
        await onSubmitFeedback({
          menu_id: menuItem.id, meal_date: menuItem.date, meal_type: mealType,
          category: 'food_quality', description: desc,
          severity: stars <= 2 ? 'high' : stars === 3 ? 'medium' : 'low',
        }).catch(() => {})
      }
      setShowModal(false)
    } catch (err) {
      setError(err.message?.toLowerCase().includes('already marked') ? 'Already marked.' : err.message || 'Something went wrong')
      setShowModal(false)
    } finally { setSubmitting(false) }
  }

  const doSkip = async () => {
    setShowModal(false); setSubmitting(true)
    try {
      await onMarkAttendance({ menu_id: menuItem.id, ate: true, rating: null })
    } catch (err) {
      setError(err.message?.toLowerCase().includes('already marked') ? 'Already marked.' : err.message || 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  return (
    <>
      {showModal && hasMenu && (
        <MealPopup
          cfg={cfg} dishes={dishes}
          onConfirm={doConfirm} onSkip={doSkip}
          onClose={() => setShowModal(false)}
          submitting={submitting}
        />
      )}

      {/* Outer wrapper — owns touch + click for flip */}
      <div
        ref={wrapRef}
        className={`meal-card-outer ${hasMenu ? 'has-menu' : ''} ${isSpecial ? 'meal-card-special' : ''}`}
        style={{ '--meal-glow': cfg.glowColor, cursor: hasMenu ? 'pointer' : 'default' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <FlipCard
          /* Controlled — we drive the flip state ourselves */
          flipped={isFlipped}
          /* Disable FlipCard's own click/drag/pointer-capture logic */
          flipOnClick={false}
          draggable={false}
          /* Still allow tilt+glare on desktop hover */
          tilt={true}
          tiltMax={8}
          glare={true}
          glareOpacity={0.16}
          hoverScale={1.0}
          width={cardWidth}
          height={230}
          radius={20}
          axis="y"
          perspective={900}
          stiffness={190}
          damping={22}
          shadow={false}
          background="transparent"
          color="#fff"
          ariaLabel={`${cfg.label} — tap to flip and see menu`}
          front={
            <CardFront
              cfg={cfg}
              isSpecial={isSpecial}
              isActive={isActive}
              marked={marked}
              hasMenu={hasMenu}
            />
          }
          back={
            <CardBack
              cfg={cfg}
              dishes={dishes}
              marked={marked}
              hasMenu={hasMenu}
              onMarkClick={() => setShowModal(true)}
            />
          }
        />

        {error && (
          <p style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: 'var(--error-color)', paddingLeft: 4 }}>
            {error}
          </p>
        )}
      </div>
    </>
  )
}
