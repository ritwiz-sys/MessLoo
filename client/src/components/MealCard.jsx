import { useState } from 'react'

// ── Per-meal config ───────────────────────────────────────────────────────────
const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast', time: '7:30 – 9:00 AM', emoji: '☀️',
    imageQuery: 'idli,dosa,upma,south+indian+breakfast',
    overlayStart: 'rgba(255,130,40,0.72)', overlayEnd: 'rgba(200,60,20,0.55)',
  },
  lunch: {
    label: 'Lunch', time: '12:00 – 2:00 PM', emoji: '🍛',
    imageQuery: 'rice,curry,thali,indian+lunch+plate',
    overlayStart: 'rgba(226,55,68,0.72)', overlayEnd: 'rgba(160,20,20,0.55)',
  },
  snacks: {
    label: 'Evening Snacks', time: '4:00 – 5:30 PM', emoji: '🫖',
    imageQuery: 'samosa,chai,snacks,indian+street+food',
    overlayStart: 'rgba(255,140,0,0.72)', overlayEnd: 'rgba(200,80,0,0.55)',
  },
  dinner: {
    label: 'Dinner', time: '7:00 – 9:30 PM', emoji: '🌙',
    imageQuery: 'roti,dal,paneer,north+indian+dinner',
    overlayStart: 'rgba(90,30,100,0.72)', overlayEnd: 'rgba(180,30,50,0.55)',
  },
}

const STAR_LABELS = ['', 'Poor 😞', 'Below average 😐', 'Decent 🙂', 'Good 😊', 'Excellent! 🤩']

function parseDishes(str) {
  if (!str) return []
  return str.split(/[,;|\/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Immediate Feedback + Attendance Modal ─────────────────────────────────────
function EatModal({ cfg, onConfirm, onSkip, submitting }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(28,28,30,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onSkip() }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-4 pb-10 animate-in slide-in-from-bottom"
        style={{ background: '#FFFFFF' }}
      >
        {/* Handle */}
        <div className="mx-auto w-10 h-1.5 rounded-full mb-5" style={{ background: '#F0E6D3' }} />

        <div className="text-center mb-5">
          <span className="text-5xl block mb-2">{cfg.emoji}</span>
          <h2 className="text-lg font-extrabold" style={{ color: '#1C1C1E' }}>{cfg.label}</h2>
          <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
            Rate this meal — your feedback goes to the mess admin
          </p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-3 mb-1">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s === stars ? 0 : s)}
              className="transition-transform active:scale-90"
              style={{ fontSize: 44, lineHeight: 1, color: s <= stars ? '#FFB830' : '#E8DDD0' }}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-semibold mb-4" style={{ color: '#E23744', minHeight: 20 }}>
          {STAR_LABELS[stars]}
        </p>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any comments? (optional) — e.g. sambar was cold"
          rows={2}
          className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none mb-4"
          style={{ background: '#FFF8F0', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
        />

        {/* Primary action */}
        <button
          onClick={() => onConfirm(stars, comment.trim())}
          disabled={submitting}
          className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 mb-3"
          style={{
            background: 'linear-gradient(135deg, #E23744, #C0392B)',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(226,55,68,0.3)',
          }}
        >
          {submitting ? 'Saving…' : stars === 0 ? '✓  Mark Eating' : '✓  Submit Feedback & Mark Eating'}
        </button>

        {/* Skip feedback */}
        <button
          onClick={onSkip}
          disabled={submitting}
          className="w-full text-center text-sm py-1 disabled:opacity-40"
          style={{ color: '#A0A0A0' }}
        >
          Skip rating, just mark attendance
        </button>
      </div>
    </div>
  )
}

// ── MealCard ──────────────────────────────────────────────────────────────────
export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance, onSubmitFeedback }) {
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [imgError, setImgError] = useState(false)

  const cfg = MEAL_CONFIG[mealType] || MEAL_CONFIG.dinner
  const hasMenu = Boolean(menuItem)
  const isSpecial = menuItem?.is_special
  const marked = Boolean(attendance)
  const dishes = parseDishes(menuItem?.items)
  const imgUrl = !imgError ? `https://source.unsplash.com/800x400/?${cfg.imageQuery}` : null

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
        }).catch(() => {}) // non-blocking
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
    setError(null)
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
      {showModal && (
        <EatModal cfg={cfg} onConfirm={doSubmit} onSkip={doSkip} submitting={submitting} />
      )}

      <div
        className="overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: isSpecial ? '2px solid #FFB830' : '1px solid #F0E6D3',
          borderRadius: 20,
          boxShadow: isSpecial ? '0 4px 20px rgba(255,184,48,0.18)' : '0 2px 16px rgba(226,55,68,0.08)',
        }}
      >
        {/* ── Image banner ── */}
        <div
          className="relative flex items-end"
          style={{
            height: 120,
            backgroundImage: [
              `linear-gradient(to bottom, ${cfg.overlayStart}, ${cfg.overlayEnd})`,
              imgUrl ? `url('${imgUrl}')` : null,
            ].filter(Boolean).join(', '),
            backgroundColor: '#C0392B',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {imgUrl && (
            <img src={imgUrl} alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
              onError={() => setImgError(true)}
            />
          )}
          <div className="relative z-10 px-4 pb-3 w-full flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{cfg.time}</p>
              <h3 className="text-base font-extrabold text-white">{cfg.label}</h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-3xl">{cfg.emoji}</span>
              {isSpecial && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFB830', color: '#FFF' }}>
                  ✨ Special
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Dish pills + action ── */}
        <div className="px-4 pt-3 pb-4">
          {!hasMenu ? (
            <p className="text-sm italic" style={{ color: '#D1C4A8' }}>No menu posted yet</p>
          ) : dishes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dishes.map((dish) => (
                <span key={dish} className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: '#FFF8F0', color: '#6B6B6B', border: '1px solid #F0E6D3' }}>
                  {dish}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm mb-3" style={{ color: '#6B6B6B' }}>{menuItem.items}</p>
          )}

          {hasMenu && (
            <>
              {error && <p className="text-xs mb-2" style={{ color: '#E23744' }}>{error}</p>}
              {marked ? (
                <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: '#E8FAF0' }}>
                  <span className="text-base">✅</span>
                  <span className="text-sm font-semibold" style={{ color: '#2ECC71' }}>You're eating this!</span>
                  {attendance?.rating ? (
                    <span className="ml-auto text-xs font-bold" style={{ color: '#FFB830' }}>
                      {'★'.repeat(attendance.rating)}{'☆'.repeat(5 - attendance.rating)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #E23744, #C0392B)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(226,55,68,0.35)',
                  }}
                >
                  {submitting ? <span>Saving…</span> : <><span>🍽️</span><span>I'll Eat This</span></>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
