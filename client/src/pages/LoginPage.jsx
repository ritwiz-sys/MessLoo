import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setSession } from '../lib/auth'
import { api } from '../lib/api'
import './LoginPage.css'

// ── Block data ────────────────────────────────────────────────────────────────
const MH_BLOCKS = ['MH1', 'MH2', 'MH3', 'MH4', 'MH5', 'MH6', 'MH7']
const LH_BLOCKS = ['LH1', 'LH2', 'LH3', 'LH4']

// ── SVG Logo mark ─────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="20" width="24" height="4" rx="2" fill="rgba(255,255,255,0.90)"/>
      <path d="M8 20C8 13.373 12.477 8 18 8C23.523 8 28 13.373 28 20H8Z" fill="rgba(255,255,255,0.80)"/>
      <path d="M13 5 Q14.5 2.5 13 0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 5 Q19.5 2.5 18 0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M23 5 Q24.5 2.5 23 0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="4" y="24" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.60)"/>
    </svg>
  )
}

// ── Animated step wrapper ─────────────────────────────────────────────────────
function StepView({ children, dir }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? 'translateX(0)' : `translateX(${dir === 'back' ? '-24px' : '24px'})`,
      transition: 'opacity 0.28s ease, transform 0.28s ease',
    }}>
      {children}
    </div>
  )
}

// ── Back button ───────────────────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', padding: 0,
      marginBottom: 18, cursor: 'pointer',
      color: 'rgba(42,26,8,.45)',
      fontSize: 13, fontWeight: 700,
      fontFamily: 'inherit',
    }}>
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
      style={{
        width: '100%',
        padding: '14px 0',
        borderRadius: 16,
        border: 'none',
        fontWeight: 800,
        fontSize: 15,
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        background: disabled || loading
          ? 'rgba(42,26,8,0.12)'
          : 'linear-gradient(135deg, #2a1a08, #3d2810)',
        color: disabled || loading ? 'rgba(42,26,8,0.35)' : '#f5ede0',
        boxShadow: disabled || loading ? 'none' : '0 6px 22px rgba(42,26,8,0.28)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseDown={e => { if (!(disabled || loading)) e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e   => { e.currentTarget.style.transform = '' }}
    >
      {loading ? <><Spinner /> Checking…</> : children}
    </button>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(42,26,8,0.2)" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#2a1a08" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function Heading({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 className="login-heading-title">{title}</h2>
      <p className="login-heading-sub">{sub}</p>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────
const STEP_COUNT = { block: 0, subblock: 1, admin: 0 }
const STEP_TOTAL = { student: 2, admin: 1 }

function ProgressDots({ step, isAdmin }) {
  const total   = isAdmin ? STEP_TOTAL.admin : STEP_TOTAL.student
  const current = STEP_COUNT[step] ?? 0
  return (
    <div className="login-dots-wrap">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          borderRadius: 99,
          height: 5,
          width: i === current ? 20 : 5,
          background: i <= current
            ? 'linear-gradient(90deg, #c08a22, #d4a017)'
            : 'rgba(42,26,8,.15)',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ── Main LoginPage ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const presetRole = location?.state?.role

  const [step, setStep]         = useState(() => presetRole === 'admin' ? 'admin' : 'block')
  const [dir, setDir]           = useState('forward')
  const [stepKey, setStepKey]   = useState(0)
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

  function handleCategory(cat) { setBlockCat(cat); go('subblock') }
  function handleBlock(block)  { setSession({ role: 'student', block }); navigate('/dashboard', { replace: true }) }

  async function handleAdminLogin(e) {
    e?.preventDefault()
    setError(null); setLoading(true)
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
    <div className="login-root">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Logo ── */}
      <div className="login-logo">
        <div className="login-logo-icon"><LogoMark /></div>
        <span className="login-logo-name">MessLoo</span>
        <span className="login-logo-sub">VIT-AP · Mess companion</span>
      </div>

      {/* ── Card ── */}
      <div className="login-card-wrap" style={{ maxWidth: 380 }}>
        <div className="login-glass-card">
          {/* Gold accent stripe */}
          <div className="login-card-accent" />

          <ProgressDots step={step} isAdmin={isAdmin} />

          <StepView key={stepKey} dir={dir}>

            {/* ── STEP: block (MH / LH) ── */}
            {step === 'block' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Heading title="Pick your mess 🏠" sub="Which hostel are you in?" />
                  <button className="login-admin-btn" onClick={() => go('admin')} style={{ marginTop: 2, flexShrink: 0 }}>
                    Admin →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="login-block-btn login-block-btn--mh" onClick={() => handleCategory('MH')}>
                    <span className="login-block-icon login-block-icon--mh">🏠</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="login-block-label">MH — Men's Hostel</span>
                      <span className="login-block-sub">MH1 – MH7 · 7 blocks</span>
                    </span>
                    <span className="login-block-arrow">›</span>
                  </button>

                  <button className="login-block-btn login-block-btn--lh" onClick={() => handleCategory('LH')}>
                    <span className="login-block-icon login-block-icon--lh">🏡</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="login-block-label">LH — Ladies' Hostel</span>
                      <span className="login-block-sub">LH1 – LH4 · 4 blocks</span>
                    </span>
                    <span className="login-block-arrow">›</span>
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: subblock ── */}
            {step === 'subblock' && (
              <>
                <BackBtn onClick={() => { setBlockCat(null); go('block', 'back') }} />
                <Heading
                  title={blockCat === 'MH' ? "🏠 Men's Hostel" : "🏡 Ladies' Hostel"}
                  sub="Tap your block number"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {(blockCat === 'MH' ? MH_BLOCKS : LH_BLOCKS).map((block, i) => (
                    <button
                      key={block}
                      onClick={() => handleBlock(block)}
                      style={{
                        padding: '14px 0',
                        borderRadius: 14,
                        border: 'none',
                        fontWeight: 800,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #2a1a08, #3d2810)',
                        color: '#f5ede0',
                        boxShadow: '0 4px 14px rgba(42,26,8,0.22)',
                        animation: `badge-pop 0.3s ease ${i * 0.04}s both`,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                      onMouseUp={e   => (e.currentTarget.style.transform = '')}
                    >
                      {block}
                    </button>
                  ))}
                </div>
                <style>{`@keyframes badge-pop { 0%{transform:scale(.75);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }`}</style>
              </>
            )}

            {/* ── STEP: admin ── */}
            {step === 'admin' && (
              <>
                <BackBtn onClick={() => { setError(null); setPassword(''); go('block', 'back') }} />
                <Heading title="Admin login 🔑" sub="Enter the admin password to continue" />
                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 14,
                      border: '1.5px solid rgba(180,140,90,.30)',
                      background: 'rgba(255,252,246,0.70)',
                      color: '#1a0e06',
                      fontSize: 16,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#c08a22')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(180,140,90,.30)')}
                  />

                  {error && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'rgba(226,55,68,.08)',
                      color: '#c02030',
                      border: '1px solid rgba(226,55,68,.20)',
                    }}>
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
      </div>

      <p className="login-footer">VIT-AP University · Mess Management System</p>
    </div>
  )
}
