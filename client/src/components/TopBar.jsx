import { useNavigate } from 'react-router-dom'
import { clearSession } from '../lib/auth'

export default function TopBar({ title, subtitle, showLogout = false }) {
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-lg">
          🍽️
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-100 leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
        </div>
      </div>

      {showLogout && (
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: 'rgba(226,55,68,0.12)',
            color: '#E23744',
            border: '1px solid rgba(226,55,68,0.25)',
          }}
        >
          🚪 Log out
        </button>
      )}
    </div>
  )
}
