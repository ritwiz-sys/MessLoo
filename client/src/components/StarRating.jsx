export default function StarRating({ value = 0, onChange, disabled = false, size = 'text-xl' }) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className={`flex items-center gap-1 ${size}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          className={`leading-none transition-colors ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
          } ${star <= value ? 'text-amber-400' : 'text-gray-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
