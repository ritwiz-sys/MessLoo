import { useState } from 'react'
import StarRating from './StarRating'

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
}

const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '🍛',
  snacks: '🍪',
  dinner: '🌙',
}

export default function MealCard({ mealType, menuItem, attendance, onMarkAttendance }) {
  const [pendingAte, setPendingAte] = useState(null)
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const hasMenu = Boolean(menuItem)
  const isSpecial = menuItem?.is_special
  const marked = Boolean(attendance)

  const choose = (ate) => { setError(null); setPendingAte(ate) }
  const reset = () => { setPendingAte(null); setRating(0); setError(null) }

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onMarkAttendance({ menu_id: menuItem.id, ate: pendingAte, rating: rating || null })
      setPendingAte(null)
      setRating(0)
    } catch (err) {
      if (err.message?.toLowerCase().includes('already marked')) {
        setError('Already marked — reload to see it.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const cardStyle = isSpecial
    ? {
        background: 'linear-gradient(135deg, #FFFBF0, #FFF3D4)',
        border: '2px solid #FFB830',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(255,184,48,0.15)',
      }
    : {
        background: '#FFFFFF',
        border: '1px solid #F0E6D3',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(226,55,68,0.06)',
      }

  return (
    <div className="flex flex-col gap-3 p-4" style={cardStyle}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{MEAL_EMOJI[mealType]}</span>
          <h3 className="text-sm font-bold" style={{ color: '#1C1C1E' }}>{MEAL_LABELS[mealType]}</h3>
        </div>
        {isSpecial && (
          <span
            className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#FFB830', color: '#FFFFFF' }}
          >
            ✨ Special
          </span>
        )}
      </div>

      {/* Menu items */}
      {hasMenu ? (
        <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B' }}>{menuItem.items}</p>
      ) : (
        <p className="text-sm italic" style={{ color: '#D1C4A8' }}>No menu posted yet</p>
      )}

      {/* Action area */}
      {hasMenu && (
        <div className="pt-2" style={{ borderTop: '1px solid #F0E6D3' }}>
          {marked ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#2ECC71' }}>
                <span>✓</span>
                <span>{attendance.ate ? "Eating" : "Skipping"}</span>
              </span>
              {attendance.rating ? (
                <StarRating value={attendance.rating} disabled size="text-sm" />
              ) : null}
            </div>
          ) : pendingAte !== null ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6B6B6B' }}>
                  {pendingAte ? 'Rate the meal (optional)' : 'Confirming skip…'}
                </span>
                {pendingAte && <StarRating value={rating} onChange={setRating} size="text-base" />}
              </div>
              {error && <p className="text-xs" style={{ color: '#E23744' }}>{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity disabled:opacity-50"
                  style={{ background: '#E23744', color: '#FFFFFF' }}
                >
                  {submitting ? 'Saving…' : 'Confirm'}
                </button>
                <button
                  onClick={reset}
                  disabled={submitting}
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  style={{ border: '1px solid #F0E6D3', color: '#6B6B6B', background: 'transparent' }}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {error && <p className="text-xs" style={{ color: '#E23744' }}>{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => choose(true)}
                  className="flex-1 text-sm font-semibold py-2 rounded-xl transition-all active:scale-95"
                  style={{ background: '#E8FAF0', color: '#2ECC71', border: '1px solid #BFF0D4' }}
                >
                  I'll eat
                </button>
                <button
                  onClick={() => choose(false)}
                  className="flex-1 text-sm font-semibold py-2 rounded-xl transition-all active:scale-95"
                  style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}
                >
                  I'll skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
