import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast',
    emoji: '☀️',
    time: '7:30 – 9:00 AM',
    gradient: 'linear-gradient(145deg, #FF9966 0%, #FF5E62 100%)',
    shadowColor: 'rgba(255,94,98,0.40)',
    dotColor: '#FF7A7A',
    fadeColor: '#FF7040',   // blends image into banner
    foodImage: '/breakfast.jpg',
    foodEmoji: '🥣',
  },
  lunch: {
    label: 'Lunch',
    emoji: '🍛',
    time: '12:00 – 2:00 PM',
    gradient: 'linear-gradient(145deg, #EB3349 0%, #F45C43 100%)',
    shadowColor: 'rgba(235,51,73,0.40)',
    dotColor: '#EB3349',
    fadeColor: '#E83040',
    foodImage: '/lunch.jpg',
    foodEmoji: '🍛',
  },
  snacks: {
    label: 'Evening Snacks',
    emoji: '🧆',
    time: '4:00 – 5:30 PM',
    gradient: 'linear-gradient(145deg, #F7971E 0%, #FFD200 100%)',
    shadowColor: 'rgba(247,151,30,0.40)',
    dotColor: '#F7971E',
    fadeColor: '#F79A1E',
    foodImage: '/snacks.jpg',
    foodEmoji: '🧆',
  },
  dinner: {
    label: 'Dinner',
    emoji: '🌙',
    time: '7:00 – 9:30 PM',
    gradient: 'linear-gradient(145deg, #C94B4B 0%, #8B0000 100%)',
    shadowColor: 'rgba(201,75,75,0.40)',
    dotColor: '#C94B4B',
    fadeColor: '#A03030',
    foodImage: '/dinner.jpg',
    foodEmoji: '🫓',
  },
}

// ── Food image — fills parent, no circle, blends into card gradient ───────────
function FoodImage({ src, emoji }) {
  const [errored, setErrored] = useState(false)
  return errored ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 46, opacity: 0.28,
    }}>
      {emoji}
    </div>
  ) : (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: 'right center',
        opacity: 0.70,
        display: 'block',
      }}
    />
  )
}

const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

function parseDishes(str) {
  if (!str) return []
  return str.split(/[,;|\/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl" style={{ background: 'var(--dish-odd)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6, width: 'fit-content' }}>
      {[0, 150, 300].map((d) => (
        <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

// ── Chat bubble ────────────────────────────────────────────────────────────────
function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? { background: 'linear-gradient(135deg,#E23744,#C0392B)', color: '#FFF', borderBottomRightRadius: 6, boxShadow: '0 2px 10px rgba(226,55,68,0.25)' }
            : { background: 'var(--dish-odd)', color: 'var(--dish-text)', border: '1px solid var(--dish-border)', borderBottomLeftRadius: 6 }
        }
      >
        {content}
      </div>
    </div>
  )
}

// ── AI Chat tab ────────────────────────────────────────────────────────────────
const CHIPS = ['Is this healthy?', 'Calories estimate?', 'Any allergens?']

function AiChat({ cfg, dishes, getToken }) {
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
      const token = await getToken()
      // Include meal context in the question
      const ctx = dishes.length
        ? `[Context: Today's ${cfg.label} includes: ${dishes.join(', ')}] `
        : `[Context: Today's ${cfg.label}] `
      const res = await api.askChat(token, ctx + q)
      setMessages((m) => [...m, { role: 'assistant', content: res?.answer || res?.reply || 'Sorry, I couldn\'t get a response.' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Couldn\'t reach Mess AI right now. Try again!' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 320 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {thinking && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && !thinking && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {CHIPS.map((c) => (
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

      {/* Input bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 mx-4 mb-3 rounded-2xl"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about this meal…"
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || thinking}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
          style={{ background: cfg.gradient, boxShadow: `0 3px 10px ${cfg.shadowColor}` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Details tab ────────────────────────────────────────────────────────────────
function DetailsTab({ cfg, dishes, onConfirm, onSkip, submitting }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div className="overflow-y-auto px-5 pb-5" style={{ maxHeight: 440 }}>
      {/* Dish list */}
      {dishes.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--dish-border)' }}>
          {dishes.map((dish, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: i % 2 === 0 ? 'var(--dish-odd)' : 'var(--dish-even)',
                borderBottom: i < dishes.length - 1 ? '1px solid var(--dish-border)' : 'none',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dotColor }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dish-text)' }}>{dish}</span>
            </div>
          ))}
        </div>
      )}

      {/* Star rating */}
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        Rate this meal
      </p>
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStars(s === stars ? 0 : s)}
            className="transition-transform active:scale-90"
            style={{ fontSize: 34, lineHeight: 1, color: s <= stars ? '#FFB830' : 'var(--handle-color)' }}
          >
            ★
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--error-color)', minHeight: 20 }}>
        {STAR_LABELS[stars]}
      </p>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments? (optional)"
        rows={2}
        className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none mb-4"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />

      {/* Confirm */}
      <button
        onClick={() => onConfirm(stars, comment.trim())}
        disabled={submitting}
        className="w-full rounded-2xl py-3.5 text-sm font-black tracking-wide transition-all active:scale-95 disabled:opacity-50 mb-2"
        style={{ background: cfg.gradient, color: '#FFF', boxShadow: `0 6px 20px ${cfg.shadowColor}` }}
      >
        {submitting ? 'Saving…' : stars === 0 ? "I'LL EAT THIS" : 'SUBMIT & MARK EATING'}
      </button>
      <button
        onClick={onSkip}
        disabled={submitting}
        className="w-full text-center text-sm py-1.5 disabled:opacity-40"
        style={{ color: 'var(--skip-color)' }}
      >
        Skip rating, just mark attendance
      </button>
    </div>
  )
}

// ── Popup modal ────────────────────────────────────────────────────────────────
function MealPopup({ cfg, dishes, onConfirm, onSkip, onClose, submitting, getToken }) {
  const [tab, setTab] = useState('details') // 'details' | 'ai'

  // Lock body scroll while popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: 400,
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--modal-border)',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.24)',
        }}
      >
        {/* Gradient strip */}
        <div style={{ height: 4, background: cfg.gradient }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: cfg.gradient, boxShadow: `0 4px 12px ${cfg.shadowColor}` }}
            >
              {cfg.emoji}
            </div>
            <div>
              <p className="text-base font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                {cfg.label}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cfg.time}</p>
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

        {/* Tabs */}
        <div
          className="flex mx-5 mb-3 rounded-2xl p-1"
          style={{ background: 'var(--seg-bg)', border: 'var(--seg-border)' }}
        >
          {[
            { key: 'details', label: '📋  Details' },
            { key: 'ai',      label: '✨  Ask AI'  },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2 text-[13px] font-bold rounded-xl transition-all"
              style={
                tab === key
                  ? { background: 'var(--seg-active-bg)', color: 'var(--seg-active-text)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                  : { color: 'var(--seg-inactive-text)', background: 'none' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'details' ? (
          <DetailsTab cfg={cfg} dishes={dishes} onConfirm={onConfirm} onSkip={onSkip} submitting={submitting} />
        ) : (
          <AiChat cfg={cfg} dishes={dishes} getToken={getToken} />
        )}
      </div>
    </div>
  )
}

// ── Glassmorphism Full-Width Card ─────────────────────────────────────────────
export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance, onSubmitFeedback, getToken, offline }) {
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const cfg = MEAL_CONFIG[mealType] || MEAL_CONFIG.dinner
  const hasMenu = Boolean(menuItem)
  const isSpecial = menuItem?.is_special
  const marked = Boolean(attendance)
  const dishes = parseDishes(menuItem?.items)

  const doConfirm = async (stars, comment) => {
    setSubmitting(true)
    setError(null)
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
    } finally {
      setSubmitting(false)
    }
  }

  const doSkip = async () => {
    setShowModal(false)
    setSubmitting(true)
    try {
      await onMarkAttendance({ menu_id: menuItem.id, ate: true, rating: null })
    } catch (err) {
      setError(err.message?.toLowerCase().includes('already marked') ? 'Already marked.' : err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {showModal && hasMenu && (
        <MealPopup
          cfg={cfg}
          dishes={dishes}
          onConfirm={doConfirm}
          onSkip={doSkip}
          onClose={() => setShowModal(false)}
          submitting={submitting}
          getToken={getToken}
        />
      )}

      <button
        type="button"
        onClick={() => hasMenu && setShowModal(true)}
        className={`w-full text-left transition-transform active:scale-[0.98] overflow-hidden ${isSpecial ? 'special-shimmer' : ''}`}
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          border: 'var(--card-border)',
          boxShadow: isSpecial ? undefined : 'var(--card-shadow)',
          borderRadius: 20,
          cursor: hasMenu ? 'pointer' : 'default',
        }}
      >
        {/* ── Gradient banner with blended food image ── */}
        <div
          style={{
            background: cfg.gradient,
            minHeight: 92,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Food image — full banner width, revealed only on the right via gradient */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <FoodImage src={cfg.foodImage} emoji={cfg.foodEmoji} />

            {/* Gradient tint: card colour blankets left 40%, then melts away right */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg,
                ${cfg.fadeColor} 0%,
                ${cfg.fadeColor} 38%,
                ${cfg.fadeColor}ee 50%,
                ${cfg.fadeColor}aa 60%,
                ${cfg.fadeColor}55 70%,
                ${cfg.fadeColor}22 80%,
                transparent 92%)`,
            }} />

            {/* Card-colour wash on top so image hue matches the card */}
            <div style={{
              position: 'absolute', inset: 0,
              background: cfg.gradient,
              opacity: 0.42,
            }} />
          </div>

          {/* Text content — stays left, z-index above image */}
          <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', flex: '0 0 58%', maxWidth: '58%' }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
              {isSpecial && (
                <span style={{
                  fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 100,
                  background: '#FCD34D', color: '#3D2C1E', letterSpacing: '0.04em',
                }}>✨ SPECIAL</span>
              )}
              {marked && (
                <span style={{
                  fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.25)', color: '#FFFFFF',
                }}>✓ EATING</span>
              )}
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 3 }}>
              {cfg.label}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{cfg.emoji}</span>{cfg.time}
            </p>
          </div>
        </div>

        {/* ── Dish list + arrow ── */}
        <div style={{ padding: '11px 14px 13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!hasMenu ? (
              <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>Menu not posted yet</p>
            ) : dishes.length > 0 ? (
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dishes.slice(0, 3).join('  ·  ')}
                </p>
                {dishes.length > 3 && (
                  <span style={{
                    display: 'inline-block', marginTop: 5,
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    background: 'var(--pill-bg)', color: 'var(--pill-color)', border: '1px solid var(--pill-border)',
                  }}>
                    +{dishes.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{menuItem.items}</p>
            )}
            {error && <p style={{ fontSize: 10, marginTop: 3, fontWeight: 600, color: 'var(--error-color)' }}>{error}</p>}
          </div>

          {hasMenu && (
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cfg.gradient, boxShadow: `0 4px 10px ${cfg.shadowColor}`,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M13 6L19 12L13 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </button>
    </>
  )
}
