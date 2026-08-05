export default function StarRating({ value = 0, onChange, disabled = false, size = 'text-xl' }) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className={`flex items-center gap-0.5 ${size}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          className={`leading-none transition-transform ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'
          }`}
          style={{ color: star <= value ? '#FFB830' : '#D1C4A8' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}
