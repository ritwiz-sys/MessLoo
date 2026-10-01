import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSession } from '../lib/auth'
import { api } from '../lib/api'

// ── Block data ────────────────────────────────────────────────────────────────
const MH_BLOCKS = ['MH1', 'MH2', 'MH3', 'MH4', 'MH5', 'MH6', 'MH7']
const LH_BLOCKS = ['LH1', 'LH2', 'LH3', 'LH4']

// ── Step definitions ──────────────────────────────────────────────────────────
// role → block → subblock → (logged in)
//   └→ admin → (logged in)

// ── Animated step wrapper ─────────────────────────────────────────────────────
// Each new step slides in from the right; going back slides from the left.
function StepView({ children, dir }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateX(0)' : `translateX(${dir === 'back' ? '-24px' : '24px'})`,
        transition: 'opacity 0.28s ease, transform 0.28s ease',
      }}
    >
      {children}
    </div>
  )
}

// ── Back button ───────────────────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-5 text-sm font-semibold flex items-center gap-1.5 active:opacity-60"
      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Back
    </button>
  )
}

// ── Primary action button ─────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
      style={{
        background: disabled || loading ? 'rgba(226,55,68,0.38)' : 'linear-gradient(135deg,#E23744,#C02030)',
        color: '#fff',
        boxShadow: disabled || loading ? 'none' : '0 6px 20px rgba(226,55,68,0.35)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading
        ? <><Spinner /> Checking…</>
        : children}
    </button>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function Heading({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

// ── Progress indicator (dots) ─────────────────────────────────────────────────
const STEP_COUNT = { role: 0, block: 1, subblock: 2, admin: 1 }
const STEP_TOTAL = { student: 3, admin: 2 }

function ProgressDots({ step, isAdmin }) {
  const total = isAdmin ? STEP_TOTAL.admin : STEP_TOTAL.student
  const current = STEP_COUNT[step] ?? 0
  return (
    <div className="flex items-center gap-2 mb-7">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:  i === current ? 20 : 6,
            height: 6,
            background: i <= current ? '#E23744' : 'var(--handle-color)',
          }}
        />
      ))}
    </div>
  )
}

// ── Main LoginPage ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep]         = useState('role')
  const [dir, setDir]           = useState('forward')   // animation direction
  const [stepKey, setStepKey]   = useState(0)           // forces StepView remount
  const [blockCat, setBlockCat] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  function go(nextStep, direction = 'forward') {
    setDir(direction)
    setStep(nextStep)
    setStepKey(k => k + 1)
    setError(null)
  }

  function handleCategory(cat) {
    setBlockCat(cat)
    go('subblock')
  }

  function handleBlock(block) {
    setSession({ role: 'student', block })
    navigate('/dashboard', { replace: true })
  }

  async function handleAdminLogin(e) {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await api.adminLogin(password)
      setSession({ role: 'admin', block: 'MH', adminToken: token })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Wrong password')
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = step === 'admin'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'transparent' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Logo ── */}
      <div
        className="mb-8 flex flex-col items-center gap-2"
        style={{ animation: 'step-in 0.5s ease both' }}
      >
        <div
          className="h-16 w-16 rounded-3xl flex items-center justify-center text-3xl"
          style={{
            background: 'linear-gradient(145deg, #E23744, #C02030)',
            boxShadow: '0 10px 28px rgba(226,55,68,0.35)',
          }}
        >
          🍱
        </div>
        <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          MessLoo
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          VIT-AP mess companion
        </span>
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-sm rounded-3xl p-6 overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          border: 'var(--card-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        }}
      >
        <ProgressDots step={step} isAdmin={isAdmin} />

        <StepView key={stepKey} dir={dir}>

          {/* ────────────── STEP: role ────────────── */}
          {step === 'role' && (
            <>
              <Heading title="Welcome back 👋" sub="Choose how you'd like to continue" />
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => go('block')}
                  className="w-full py-4 rounded-2xl font-bold text-base flex items-center gap-4 px-5 transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg,#E23744,#C02030)',
                    color: '#fff',
                    boxShadow: '0 6px 20px rgba(226,55,68,0.32)',
                  }}
                >
                  <span className="text-2xl">🎓</span>
                  <span className="flex flex-col items-start">
                    <span className="text-base font-extrabold">Student</span>
                    <span className="text-xs font-medium opacity-75">Pick your block to see the menu</span>
                  </span>
                  <span className="ml-auto opacity-60">›</span>
                </button>

                <button
                  onClick={() => go('admin')}
                  className="w-full py-4 rounded-2xl font-bold text-base flex items-center gap-4 px-5 transition-all active:scale-95"
                  style={{
                    background: 'var(--toggle-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--dish-border)',
                  }}
                >
                  <span className="text-2xl">🔑</span>
                  <span className="flex flex-col items-start">
                    <span className="text-base font-extrabold">Admin</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Manage menus & analytics</span>
                  </span>
                  <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>›</span>
                </button>
              </div>
            </>
          )}

          {/* ────────────── STEP: block (MH / LH) ────────────── */}
          {step === 'block' && (
            <>
              <BackBtn onClick={() => go('role', 'back')} />
              <Heading title="Pick your mess 🏠" sub="Which hostel are you in?" />
              <div className="flex flex-col gap-3">
                {[
                  { cat: 'MH', label: "Men's Hostel", sub: 'MH1 – MH7', emoji: '🏠', color: '#4A90E2' },
                  { cat: 'LH', label: "Ladies' Hostel", sub: 'LH1 – LH4', emoji: '🏡', color: '#E2779A' },
                ].map(({ cat, label, sub, emoji, color }) => (
                  <button
                    key={cat}
                    onClick={() => handleCategory(cat)}
                    className="w-full py-4 rounded-2xl flex items-center gap-4 px-5 transition-all active:scale-95"
                    style={{
                      background: `${color}18`,
                      border: `1.5px solid ${color}35`,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span
                      className="text-xl h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}22`, fontSize: 20 }}
                    >
                      {emoji}
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-base font-extrabold">{cat} — {label}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                    </span>
                    <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ────────────── STEP: subblock ────────────── */}
          {step === 'subblock' && (
            <>
              <BackBtn onClick={() => { setBlockCat(null); go('block', 'back') }} />
              <Heading
                title={blockCat === 'MH' ? '🏠 Men\'s Hostel' : '🏡 Ladies\' Hostel'}
                sub="Tap your block number"
              />
              <div className="grid grid-cols-3 gap-3">
                {(blockCat === 'MH' ? MH_BLOCKS : LH_BLOCKS).map((block, i) => (
                  <button
                    key={block}
                    onClick={() => handleBlock(block)}
                    className="py-4 rounded-2xl font-extrabold text-base transition-all active:scale-90"
                    style={{
                      background: 'linear-gradient(135deg,#E23744,#C02030)',
                      color: '#fff',
                      boxShadow: '0 4px 14px rgba(226,55,68,0.28)',
                      animation: `badge-pop 0.3s ease ${i * 0.04}s both`,
                    }}
                  >
                    {block}
                  </button>
                ))}
              </div>
              <style>{`
                @keyframes badge-pop {
                  0%   { transform: scale(0.75); opacity: 0; }
                  60%  { transform: scale(1.06); }
                  100% { transform: scale(1);    opacity: 1; }
                }
              `}</style>
            </>
          )}

          {/* ────────────── STEP: admin ────────────── */}
          {step === 'admin' && (
            <>
              <BackBtn onClick={() => { setError(null); setPassword(''); go('role', 'back') }} />
              <Heading title="Admin login 🔑" sub="Enter the admin password to continue" />
              <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1.5px solid var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#E23744')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--input-border)')}
                />

                {error && (
                  <div
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--error-bg)', color: 'var(--error-color)', border: '1px solid var(--error-border)' }}
                  >
                    {error}
                  </div>
                )}

                <PrimaryBtn disabled={!password} loading={loading}>
                  Enter →
                </PrimaryBtn>
              </form>
            </>
          )}

        </StepView>
      </div>

      {/* ── Footer ── */}
      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        VIT-AP University · Mess Management System
      </p>
    </div>
  )
}
