import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSession } from '../lib/auth'
import { api } from '../lib/api'

// ── Step machine ──────────────────────────────────────────────────────────────
// 'role'     → pick Student or Admin
// 'block'    → student picks MH or LH (hostel category)
// 'subblock' → student picks specific block (MH1-MH7 or LH1-LH4)
// 'admin'    → admin enters password

const MH_BLOCKS = ['MH1', 'MH2', 'MH3', 'MH4', 'MH5', 'MH6', 'MH7']
const LH_BLOCKS = ['LH1', 'LH2', 'LH3', 'LH4']

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep]         = useState('role')   // 'role' | 'block' | 'subblock' | 'admin'
  const [blockCat, setBlockCat] = useState(null)     // 'MH' | 'LH'
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  // Student chose a hostel category (MH / LH) — go to subblock step
  function handleCategory(cat) {
    setBlockCat(cat)
    setStep('subblock')
  }

  // Student chose a specific block (e.g. 'MH3')
  function handleBlock(block) {
    setSession({ role: 'student', block })
    navigate('/dashboard', { replace: true })
  }

  // Admin submitted password
  async function handleAdminLogin(e) {
    e.preventDefault()
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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'transparent' }}
    >
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: '#E23744', boxShadow: '0 12px 32px rgba(226,55,68,0.30)' }}
        >
          🍱
        </div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          MessLoo
        </h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          VIT-AP mess companion
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-7"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          border: 'var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >

        {/* ── STEP: role ── */}
        {step === 'role' && (
          <>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Who are you?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Choose how you'd like to continue
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('block')}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3"
                style={{ background: '#E23744', color: '#fff', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
              >
                🎓 Student
              </button>
              <button
                onClick={() => setStep('admin')}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3"
                style={{
                  background: 'var(--toggle-bg)',
                  color: 'var(--text-primary)',
                  border: 'var(--card-border)',
                }}
              >
                🔑 Admin
              </button>
            </div>
          </>
        )}

        {/* ── STEP: block (category) ── */}
        {step === 'block' && (
          <>
            <button
              onClick={() => setStep('role')}
              className="mb-4 text-sm font-semibold flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Pick your mess
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Which hostel are you in?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleCategory('MH')}
                className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3"
                style={{ background: '#E23744', color: '#fff', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
              >
                🏠 MH — Men's Hostel
              </button>
              <button
                onClick={() => handleCategory('LH')}
                className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3"
                style={{
                  background: 'var(--toggle-bg)',
                  color: 'var(--text-primary)',
                  border: 'var(--card-border)',
                }}
              >
                🏡 LH — Ladies' Hostel
              </button>
            </div>
          </>
        )}

        {/* ── STEP: subblock (specific block number) ── */}
        {step === 'subblock' && (
          <>
            <button
              onClick={() => { setStep('block'); setBlockCat(null) }}
              className="mb-4 text-sm font-semibold flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {blockCat === 'MH' ? '🏠 Men\'s Hostel' : '🏡 Ladies\' Hostel'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Select your block
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(blockCat === 'MH' ? MH_BLOCKS : LH_BLOCKS).map(block => (
                <button
                  key={block}
                  onClick={() => handleBlock(block)}
                  className="py-4 rounded-2xl font-bold text-base"
                  style={{ background: '#E23744', color: '#fff', boxShadow: '0 4px 12px rgba(226,55,68,0.25)' }}
                >
                  {block}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── STEP: admin ── */}
        {step === 'admin' && (
          <>
            <button
              onClick={() => { setStep('role'); setError(null); setPassword('') }}
              className="mb-4 text-sm font-semibold flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Admin login
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Enter the admin password to continue
            </p>
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-base font-medium outline-none"
                style={{
                  background: 'var(--input-bg)',
                  border: 'var(--card-border)',
                  color: 'var(--text-primary)',
                }}
              />
              {error && (
                <p className="text-sm font-semibold" style={{ color: 'var(--error-color)' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 rounded-2xl font-bold text-base"
                style={{
                  background: loading || !password ? 'rgba(226,55,68,0.4)' : '#E23744',
                  color: '#fff',
                }}
              >
                {loading ? 'Checking…' : 'Enter'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
