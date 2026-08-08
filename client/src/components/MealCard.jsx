import { useState } from 'react'

const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast',
    time: '7:30 – 9:00 AM',
    gradient: 'linear-gradient(145deg, #FF9966 0%, #FF5E62 100%)',
    shadowColor: 'rgba(255,94,98,0.35)',
  },
  lunch: {
    label: 'Lunch',
    time: '12:00 – 2:00 PM',
    gradient: 'linear-gradient(145deg, #EB3349 0%, #F45C43 100%)',
    shadowColor: 'rgba(235,51,73,0.35)',
  },
  snacks: {
    label: 'Evening Snacks',
    time: '4:00 – 5:30 PM',
    gradient: 'linear-gradient(145deg, #F7971E 0%, #FFD200 100%)',
    shadowColor: 'rgba(247,151,30,0.35)',
  },
  dinner: {
    label: 'Dinner',
    time: '7:00 – 9:30 PM',
    gradient: 'linear-gradient(145deg, #C94B4B 0%, #8B0000 100%)',
    shadowColor: 'rgba(201,75,75,0.35)',
  },
}

const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

function parseDishes(str) {
  if (!str) return []
  return str.split(/[,;|\/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Eat + Feedback Bottom Sheet ───────────────────────────────────────────────
function EatModal({ cfg, dishes, onConfirm, onSkip, submitting }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(15,10,5,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onSkip() }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ background: '#FFFAF5' }}
      >
        {/* Gradient accent strip at top */}
        <div style={{ height: 4, background: cfg.gradient }} />

        <div className="px-6 pt-5 pb-10">
          {/* Handle */}
          <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ background: '#EEE3D6' }} />

          <div className="mb-5">
            <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>{cfg.label}</h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#8B7355' }}>{cfg.time}</p>
          </div>

          {/* Dish list */}
          {dishes.length > 0 && (
            <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid #F0E6D3' }}>
              {dishes.map((dish, i) => (
                <div
                  key={dish}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: i % 2 === 0 ? '#FFFAF5' : '#FFF6EE', borderBottom: i < dishes.length - 1 ? '1px solid #F0E6D3' : 'none' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#E23744' }} />
                  <span className="text-sm font-medium" style={{ color: '#3D2C1E' }}>{dish}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stars */}
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#B08040' }}>
            Rate this meal
          </p>
          <div className="flex gap-2 mb-1">
            {[1,2,3,4,5].map((s) => (
              <button
                key={s}
                onClick={() => setStars(s === stars ? 0 : s)}
                className="transition-transform active:scale-90"
                style={{ fontSize: 38, lineHeight: 1, color: s <= stars ? '#FFB830' : '#EEE3D6' }}
              >★</button>
            ))}
          </div>
          <p className="text-sm font-semibold mb-4" style={{ color: '#E23744', minHeight: 20 }}>
            {STAR_LABELS[stars]}
          </p>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            rows={2}
            className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none mb-4"
            style={{ background: '#FFF6EE', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
          />

          <button
            onClick={() => onConfirm(stars, comment.trim())}
            disabled={submitting}
            className="w-full rounded-2xl py-4 text-sm font-black transition-all active:scale-95 disabled:opacity-50 mb-3"
            style={{ background: cfg.gradient, color: '#FFF', boxShadow: `0 8px 24px ${cfg.shadowColor}`, letterSpacing: '0.03em' }}
          >
            {submitting ? 'Saving…' : stars === 0 ? "I'LL EAT THIS" : "SUBMIT & MARK EATING"}
          </button>

          <button onClick={onSkip} disabled={submitting} className="w-full text-center text-sm py-1 disabled:opacity-40" style={{ color: '#B0956E' }}>
            Skip rating, just mark attendance
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Grid Card ─────────────────────────────────────────────────────────────────
export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance, onSubmitFeedback }) {
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const cfg = MEAL_CONFIG[mealType] || MEAL_CONFIG.dinner
  const hasMenu = Boolean(menuItem)
  const isSpecial = menuItem?.is_special
  const marked = Boolean(attendance)
  const dishes = parseDishes(menuItem?.items)

  const doSubmit = async (stars, comment) => {
    setSubmitting(true)
    setError(null)
    try {
      await onMarkAttendance({ menu_id: menuItem.id, ate: true, rating: stars || null })
      if (onSubmitFeedback && (stars > 0 || comment)) {
        const desc = [stars > 0 ? `Rated ${stars}/5 stars` : null, comment || null].filter(Boolean).join(' — ')
        await onSubmitFeedback({
          menu_id: menuItem.id,
          meal_date: menuItem.date,
          meal_type: mealType,
          category: 'food_quality',
          description: desc,
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
        <EatModal cfg={cfg} dishes={dishes} onConfirm={doSubmit} onSkip={doSkip} submitting={submitting} />
      )}

      <button
        type="button"
        onClick={() => hasMenu && setShowModal(true)}
        className="relative overflow-hidden rounded-3xl text-left w-full transition-transform active:scale-95"
        style={{
          background: cfg.gradient,
          boxShadow: `0 8px 28px ${cfg.shadowColor}`,
          minHeight: 180,
          cursor: hasMenu ? 'pointer' : 'default',
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between px-4 pt-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {cfg.time}
            </p>
            <h3 className="text-base font-black text-white mt-0.5 leading-tight">
              {cfg.label}
            </h3>
          </div>

          {/* Status badge top-right */}
          <div className="flex flex-col items-end gap-1">
            {isSpecial && (
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: '#FFD200', color: '#3D2C1E' }}
              >
                SPECIAL
              </span>
            )}
            {marked && (
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.25)', color: '#FFF' }}
              >
                ✓ EATING
              </span>
            )}
          </div>
        </div>

        {/* Dish preview */}
        <div className="px-4 mt-3">
          {!hasMenu ? (
            <p className="text-xs font-medium italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Menu not posted yet
            </p>
          ) : dishes.length > 0 ? (
            <p className="text-xs font-semibold leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {dishes.slice(0, 3).join('  ·  ')}{dishes.length > 3 ? `  +${dishes.length - 3}` : ''}
            </p>
          ) : (
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {menuItem.items}
            </p>
          )}
          {error && <p className="text-[10px] mt-1" style={{ color: '#FFD200' }}>{error}</p>}
        </div>

        {/* Bottom row */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-4 pt-2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)' }}
        >
          {/* Arrow button */}
          {hasMenu && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M13 6L19 12L13 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* Dish count badge */}
          {dishes.length > 0 && (
            <span
              className="text-[10px] font-black px-2.5 py-1 rounded-full ml-auto"
              style={{ background: 'rgba(0,0,0,0.25)', color: '#FFF' }}
            >
              {dishes.length} dishes
            </span>
          )}
        </div>

        {/* Decorative circle (subtle texture) */}
        <div
          className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
      </button>
    </>
  )
}
