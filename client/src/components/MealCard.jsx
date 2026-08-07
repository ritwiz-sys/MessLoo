import { useState } from 'react'

// ── Per-meal config (no emojis) ───────────────────────────────────────────────
const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast',
    time: '7:30 – 9:00 AM',
    accent: '#F59E0B',
    accentBg: 'rgba(245,158,11,0.08)',
    strip: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
  },
  lunch: {
    label: 'Lunch',
    time: '12:00 – 2:00 PM',
    accent: '#E23744',
    accentBg: 'rgba(226,55,68,0.07)',
    strip: 'linear-gradient(135deg, #FFE4E6, #FECDD3)',
  },
  snacks: {
    label: 'Evening Snacks',
    time: '4:00 – 5:30 PM',
    accent: '#D97706',
    accentBg: 'rgba(217,119,6,0.07)',
    strip: 'linear-gradient(135deg, #FEF9C3, #FEF08A)',
  },
  dinner: {
    label: 'Dinner',
    time: '7:00 – 9:30 PM',
    accent: '#7C3AED',
    accentBg: 'rgba(124,58,237,0.07)',
    strip: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
  },
}

const STAR_LABELS = ['', 'Poor', 'Below average', 'Decent', 'Good', 'Excellent!']

function parseDishes(str) {
  if (!str) return []
  return str.split(/[,;|\/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Eat + Feedback Modal ──────────────────────────────────────────────────────
function EatModal({ cfg, onConfirm, onSkip, submitting }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,14,8,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onSkip() }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-4 pb-10"
        style={{
          background: 'rgba(255,252,246,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(245,158,11,0.2)',
        }}
      >
        {/* Handle */}
        <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ background: '#F0E6D3' }} />

        {/* Accent strip */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: cfg.strip }}
        />

        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold" style={{ color: '#1C1C1E' }}>{cfg.label}</h2>
          <p className="text-sm mt-1" style={{ color: '#8B7355' }}>
            Rate this meal — your feedback helps the mess
          </p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-3 mb-1">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s === stars ? 0 : s)}
              className="transition-transform active:scale-90"
              style={{ fontSize: 42, lineHeight: 1, color: s <= stars ? '#F59E0B' : '#E8DDD0' }}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-semibold mb-4" style={{ color: cfg.accent, minHeight: 20 }}>
          {STAR_LABELS[stars]}
        </p>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any comments? (optional)"
          rows={2}
          className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none mb-4"
          style={{
            background: 'rgba(255,248,240,0.8)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#1C1C1E',
          }}
        />

        {/* Actions */}
        <button
          onClick={() => onConfirm(stars, comment.trim())}
          disabled={submitting}
          className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 mb-3"
          style={{
            background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
            color: '#FFFFFF',
            boxShadow: `0 6px 20px ${cfg.accent}40`,
          }}
        >
          {submitting ? 'Saving…' : stars === 0 ? 'Mark Eating' : 'Submit & Mark Eating'}
        </button>

        <button
          onClick={onSkip}
          disabled={submitting}
          className="w-full text-center text-sm py-1 disabled:opacity-40"
          style={{ color: '#B0956E' }}
        >
          Skip rating, just mark attendance
        </button>
      </div>
    </div>
  )
}

// ── MealCard ──────────────────────────────────────────────────────────────────
export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance, onSubmitFeedback }) {
  const [expanded, setExpanded] = useState(false)
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
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isSpecial
            ? '1.5px solid rgba(245,158,11,0.5)'
            : '1px solid rgba(255,255,255,0.9)',
          borderRadius: 20,
          boxShadow: isSpecial
            ? '0 8px 32px rgba(245,158,11,0.15), 0 2px 8px rgba(0,0,0,0.04)'
            : '0 4px 24px rgba(180,120,40,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* ── Collapsed / always-visible header row ── */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left"
          style={{ background: cfg.strip }}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            {/* Left: colour dot + label + time */}
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: cfg.accent }}
              />
              <div>
                <h3 className="text-sm font-extrabold tracking-tight" style={{ color: '#1C1C1E' }}>
                  {cfg.label}
                </h3>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: `${cfg.accent}bb` }}>
                  {cfg.time}
                </p>
              </div>
            </div>

            {/* Right: badges + chevron */}
            <div className="flex items-center gap-2">
              {isSpecial && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#F59E0B', color: '#FFF' }}
                >
                  Special
                </span>
              )}
              {marked && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(46,204,113,0.18)', color: '#16a34a', border: '1px solid rgba(46,204,113,0.3)' }}
                >
                  Attending
                </span>
              )}
              {/* First dish preview when collapsed */}
              {!expanded && hasMenu && dishes.length > 0 && (
                <span
                  className="text-[11px] font-medium hidden sm:inline-block max-w-[90px] truncate"
                  style={{ color: '#8B7355' }}
                >
                  {dishes[0]}{dishes.length > 1 ? ` +${dishes.length - 1}` : ''}
                </span>
              )}
              <span
                className="text-base font-light ml-1 transition-transform duration-200"
                style={{
                  color: '#C8B89A',
                  display: 'inline-block',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ›
              </span>
            </div>
          </div>
        </button>

        {/* ── Expanded body ── */}
        {expanded && (
          <div
            className="px-4 pt-3 pb-4"
            style={{ borderTop: `1px solid ${cfg.accent}18` }}
          >
            {!hasMenu ? (
              <p className="text-sm italic mb-3" style={{ color: '#C8B89A' }}>Menu not posted yet</p>
            ) : dishes.length > 0 ? (
              <div className="flex flex-col gap-0.5 mb-3">
                {dishes.map((dish, i) => (
                  <div
                    key={dish}
                    className="flex items-center gap-2.5 py-1.5"
                    style={{ borderBottom: i < dishes.length - 1 ? '1px solid rgba(240,230,211,0.5)' : 'none' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.accent }} />
                    <span className="text-sm" style={{ color: '#3D2C1E' }}>{dish}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-3" style={{ color: '#6B6B6B' }}>{menuItem.items}</p>
            )}

            {hasMenu && (
              <>
                {error && <p className="text-xs mb-2" style={{ color: '#E23744' }}>{error}</p>}
                {marked ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                      Marked — you're eating this
                    </span>
                    {attendance?.rating ? (
                      <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                        {'★'.repeat(attendance.rating)}{'☆'.repeat(5 - attendance.rating)}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={submitting}
                    className="w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${cfg.accent}ee, ${cfg.accent})`,
                      color: '#FFFFFF',
                      boxShadow: `0 4px 16px ${cfg.accent}35`,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {submitting ? 'Saving…' : "I'll Eat This"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
