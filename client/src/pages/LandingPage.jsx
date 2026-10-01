import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

// ── Feature cards data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    emoji: '🍛',
    title: "Today's Menu",
    desc: "See exactly what's being served for every meal — breakfast, lunch, snacks & dinner.",
    accent: '#E23744',
    bg: 'rgba(226,55,68,0.10)',
    border: 'rgba(226,55,68,0.18)',
  },
  {
    emoji: '⭐',
    title: 'Rate Your Meal',
    desc: 'Give feedback after eating. Help the mess improve one star at a time.',
    accent: '#FFB830',
    bg: 'rgba(255,184,48,0.10)',
    border: 'rgba(255,184,48,0.20)',
  },
  {
    emoji: '🤖',
    title: 'AI Mess Chat',
    desc: 'Ask anything about the menu, nutrition, or upcoming specials. Instant answers.',
    accent: '#7C5CFC',
    bg: 'rgba(124,92,252,0.10)',
    border: 'rgba(124,92,252,0.18)',
  },
]

// ── Floating food pills (decorative) ─────────────────────────────────────────
const FOOD_EMOJIS = ['🍛', '🥣', '🧆', '🍚', '🥗', '🍱', '☕', '🥞', '🌮', '🫓']

function FloatingPill({ emoji, style }) {
  return (
    <div
      className="absolute select-none pointer-events-none"
      style={{
        fontSize: 22,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'var(--card-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        animation: 'float-pill 6s ease-in-out infinite',
        ...style,
      }}
    >
      {emoji}
    </div>
  )
}

// ── Animated count-up stat ────────────────────────────────────────────────────
function StatBadge({ value, label, delay = 0 }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-2xl font-black"
        style={{
          color: 'var(--text-primary)',
          opacity: shown ? 1 : 0,
          transform: shown ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {value}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [heroIn, setHeroIn] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const session = getSession()
    if (session) {
      navigate(session.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [navigate])

  // Trigger hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-x-hidden"
      style={{ background: 'transparent' }}
    >
      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes float-pill {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .feature-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
        }
        .feature-card:active {
          transform: scale(0.97);
        }
      `}</style>

      {/* ── Floating food pills (background) ── */}
      <FloatingPill emoji="🍛" style={{ top: '12%',  left:  '5%',  animationDelay: '0s',   animationDuration: '7s'  }} />
      <FloatingPill emoji="🥣" style={{ top: '8%',   right: '8%',  animationDelay: '1.2s', animationDuration: '6s'  }} />
      <FloatingPill emoji="🧆" style={{ top: '28%',  left:  '2%',  animationDelay: '2.4s', animationDuration: '8s'  }} />
      <FloatingPill emoji="☕" style={{ top: '22%',  right: '4%',  animationDelay: '0.6s', animationDuration: '5.5s'}} />
      <FloatingPill emoji="🥞" style={{ top: '45%',  left:  '3%',  animationDelay: '3s',   animationDuration: '7.5s'}} />
      <FloatingPill emoji="🍚" style={{ top: '50%',  right: '2%',  animationDelay: '1.8s', animationDuration: '6.5s'}} />

      {/* ── Hero section ── */}
      <section
        className="w-full flex flex-col items-center pt-16 pb-10 px-6 text-center"
        style={{
          opacity:    heroIn ? 1 : 0,
          transform:  heroIn ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* App icon */}
        <div
          className="relative mb-6"
          style={{ animation: 'badge-pop 0.6s ease 0.2s both' }}
        >
          {/* Spinning ring */}
          <div
            className="absolute inset-0 rounded-[32px]"
            style={{
              background: 'conic-gradient(from 0deg, #E23744, #FFB830, #7C5CFC, #E23744)',
              padding: 3,
              borderRadius: 36,
              animation: 'spin-slow 4s linear infinite',
              zIndex: 0,
            }}
          />
          <div
            className="relative z-10 h-24 w-24 rounded-[28px] flex items-center justify-center text-5xl"
            style={{
              background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
              boxShadow: '0 16px 48px rgba(226,55,68,0.35)',
              margin: 3,
            }}
          >
            🍱
          </div>
        </div>

        {/* Brand name */}
        <h1
          className="text-5xl font-black tracking-tight mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          MessLoo
        </h1>
        <p
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          VIT-AP University
        </p>
        <p
          className="text-sm max-w-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Your smart mess companion — menus, ratings & AI chat, all in one place.
        </p>

        {/* Stats row */}
        <div
          className="flex items-center gap-8 mt-8 mb-8 px-6 py-4 rounded-2xl"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: 'var(--card-border)',
          }}
        >
          <StatBadge value="11" label="Blocks"  delay={600} />
          <div style={{ width: 1, height: 32, background: 'var(--card-border)' }} />
          <StatBadge value="4"  label="Meals/day" delay={750} />
          <div style={{ width: 1, height: 32, background: 'var(--card-border)' }} />
          <StatBadge value="AI" label="Chat"    delay={900} />
        </div>

        {/* CTA button */}
        <button
          onClick={() => navigate('/login')}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #E23744 0%, #C02030 100%)',
            color: '#fff',
            boxShadow: '0 8px 28px rgba(226,55,68,0.40)',
            letterSpacing: '-0.01em',
          }}
        >
          Get Started →
        </button>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          No account needed · Just pick your block
        </p>
      </section>

      {/* ── Feature cards ── */}
      <section className="w-full max-w-md px-5 pb-8 flex flex-col gap-4">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="feature-card flex items-start gap-4 p-5 rounded-3xl"
            style={{
              background: 'var(--card-bg)',
              backdropFilter: 'var(--card-blur)',
              WebkitBackdropFilter: 'var(--card-blur)',
              border: `1px solid ${f.border}`,
              boxShadow: 'var(--card-shadow)',
              opacity:    heroIn ? 1 : 0,
              transform:  heroIn ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.5s ease ${0.4 + i * 0.12}s, transform 0.5s ease ${0.4 + i * 0.12}s`,
            }}
          >
            <div
              className="text-2xl h-12 w-12 flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ background: f.bg, fontSize: 24 }}
            >
              {f.emoji}
            </div>
            <div>
              <h3
                className="text-base font-bold mb-0.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Bottom CTA ── */}
      <section className="w-full max-w-md px-5 pb-16 text-center">
        <div
          className="rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(226,55,68,0.12) 0%, rgba(124,92,252,0.10) 100%)',
            border: '1px solid rgba(226,55,68,0.15)',
          }}
        >
          <div className="text-3xl mb-3">🎓</div>
          <h2
            className="text-lg font-extrabold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            For VIT-AP Students
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Pick your hostel block and instantly see your mess menu — no login, no password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl font-bold text-sm"
            style={{
              background: 'var(--seg-active-bg)',
              color: 'var(--seg-active-text)',
              boxShadow: '0 4px 16px rgba(226,55,68,0.25)',
            }}
          >
            Enter MessLoo
          </button>
        </div>
      </section>
    </div>
  )
}
