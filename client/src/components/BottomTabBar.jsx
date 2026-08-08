import { useLocation, useNavigate } from 'react-router-dom'

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        fill={active ? '#E23744' : 'none'}
        stroke={active ? '#E23744' : '#6B6B6B'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChatIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3C7.02944 3 3 6.68629 3 11.25C3 13.1714 3.70711 14.9286 4.90625 16.3125L3.375 21L8.0625 19.5C9.22656 20.1563 10.5703 20.5 12 20.5C16.9706 20.5 21 16.8137 21 12.25C21 7.68629 16.9706 4 12 4"
        fill={active ? '#FFE8EA' : 'none'}
        stroke={active ? '#E23744' : '#6B6B6B'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 11H16M8 15H13" stroke={active ? '#E23744' : '#6B6B6B'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12" cy="8" r="4"
        fill={active ? '#FFE8EA' : 'none'}
        stroke={active ? '#E23744' : '#6B6B6B'}
        strokeWidth="1.8"
      />
      <path
        d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
        stroke={active ? '#E23744' : '#6B6B6B'}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

const TABS = [
  { path: '/dashboard', label: 'Menu',    Icon: HomeIcon },
  { path: '/profile',   label: 'Profile', Icon: ProfileIcon },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ backgroundColor: 'transparent' }}
    >
      <nav
        className="w-full max-w-lg"
        style={{
          background: 'rgba(255,244,236,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(235,51,73,0.1)',
          boxShadow: '0 -4px 24px rgba(235,51,73,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center">
          {TABS.map(({ path, label, Icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all"
              >
                <Icon active={active} />
                <span
                  className="text-[10px] font-semibold tracking-wide"
                  style={{ color: active ? '#E23744' : '#6B6B6B' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
