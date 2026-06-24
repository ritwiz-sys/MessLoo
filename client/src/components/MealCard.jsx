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
  const [pendingAte, setPendingAte] = useState(null) // null | true | false
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const hasMenu = Boolean(menuItem)
  // Source of truth: the attendance record passed down from StudentDashboard,
  // which was loaded from GET /attendance on mount. Not local component state,
  // so a page reload still shows the meal as marked.
  const marked = Boolean(attendance)

  const choose = (ate) => {
    setError(null)
    setPendingAte(ate)
  }

  const reset = () => {
    setPendingAte(null)
    setRating(0)
    setError(null)
  }

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onMarkAttendance({
        menu_id: menuItem.id,
        ate: pendingAte,
        rating: rating || null,
      })
      setPendingAte(null)
      setRating(0)
    } catch (err) {
      if (err.message?.toLowerCase().includes('already marked')) {
        setError('Already marked for this meal — refresh the page to see it.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#15151c] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{MEAL_EMOJI[mealType]}</span>
          <h3 className="text-base font-semibold text-gray-100">{MEAL_LABELS[mealType]}</h3>
        </div>
        {menuItem?.is_special && (
          <span className="shrink-0 rounded-full bg-amber-400/15 text-amber-300 text-xs font-medium px-2.5 py-1 border border-amber-400/30">
            ✨ Special
          </span>
        )}
      </div>

      {hasMenu ? (
        <p className="text-sm text-gray-400 leading-relaxed">{menuItem.items}</p>
      ) : (
        <p className="text-sm text-gray-600 italic">No menu posted yet</p>
      )}

      {hasMenu && (
        <div className="mt-auto pt-2 border-t border-white/5">
          {marked ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span>✓</span>
                <span>{attendance.ate ? 'Marked as eating' : 'Marked as skipping'}</span>
              </div>
              {attendance.rating ? (
                <StarRating value={attendance.rating} disabled size="text-sm" />
              ) : null}
            </div>
          ) : pendingAte !== null ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {pendingAte ? 'Rate the meal (optional)' : 'Skipping this meal'}
                </span>
                {pendingAte && <StarRating value={rating} onChange={setRating} size="text-lg" />}
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black text-sm font-medium py-2 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Confirm'}
                </button>
                <button
                  onClick={reset}
                  disabled={submitting}
                  className="rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 text-sm px-4 py-2 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => choose(true)}
                  className="flex-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-sm font-medium py-2 transition-colors"
                >
                  I'll eat
                </button>
                <button
                  onClick={() => choose(false)}
                  className="flex-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-sm font-medium py-2 transition-colors"
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
