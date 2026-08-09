import { useLocation, useNavigate } from 'react-router-dom'

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: active ? 0.9 : 1 }}
      />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="8" r="4"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        style={{ opacity: active ? 0.25 : 1 }}
      />
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

const TABS = [
  { path: '/dashboard', label: 'Home',    Icon: HomeIcon    },
  { path: '/profile',   label: 'Profile', Icon: ProfileIcon },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
    >
      <nav
        className="pointer-events-auto"
        style={{
          /* Floating pill shape */
          display: 'flex',
          alignItems: 'center',
          borderRadius: 100,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 6,
          paddingBottom: 6,
          gap: 4,

          /* Frosted glass */
          background: 'var(--bottom-bar-bg)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid var(--bottom-bar-border)',

          /* Hover shadow — makes it float */
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
        }}
      >
        {TABS.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
              style={{
                color: active ? 'var(--tab-active)' : 'var(--tab-inactive)',
                borderRadius: 80,
                padding: '8px 28px',
                /* Active pill highlight */
                background: active ? 'var(--tab-active-bg, rgba(226,55,68,0.10))' : 'transparent',
                minWidth: 80,
              }}
            >
              <Icon active={active} />
              <span className="text-[10px] font-bold tracking-wide">
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
