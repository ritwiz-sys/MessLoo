import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../context/UserContext'
import { api } from '../lib/api'
import { useAuth } from '@clerk/react'

// ── Inline BlockPicker with warm styles ──────────────────────────────────────
function WarmBlockPicker({ onSelect }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getBlocks()
      .then((res) => setBlocks(res?.data || []))
      .catch((err) => setError(err.message || 'Failed to load blocks'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = {}
    for (const b of blocks) {
      const cat = b.block_category || 'Other'
      map[cat] = map[cat] || []
      map[cat].push(b)
    }
    return map
  }, [blocks])

  const categories = Object.keys(grouped).sort()
  const selectedBlock = blocks.find((b) => b.id === selectedId)

  const handleConfirm = async () => {
    if (!selectedId) return
    setSubmitting(true)
    try {
      await onSelect(selectedId)
    } catch (err) {
      setError(err.message || 'Failed to save block')
      setSubmitting(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="rounded-2xl p-3 mb-4 text-sm font-medium" style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#F0E6D3' }} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm italic text-center py-8" style={{ color: '#6B6B6B' }}>
          No blocks set up yet. Contact your mess admin.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D1C4A8' }}>{cat}</p>
              <div className="grid grid-cols-3 gap-2">
                {grouped[cat].map((block) => {
                  const active = block.id === selectedId
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setSelectedId(block.id)}
                      className="flex flex-col items-start rounded-2xl py-3 px-3 transition-all active:scale-95"
                      style={{
                        background: active ? '#FFF0F1' : '#FAFAFA',
                        border: active ? '2px solid #E23744' : '1px solid #F0E6D3',
                        color: active ? '#E23744' : '#1C1C1E',
                      }}
                    >
                      <span className="text-sm font-bold">{block.name || block.block_name}</span>
                      {block.catering_company && (
                        <span className="text-[10px] font-medium mt-0.5" style={{ color: active ? '#E23744' : '#6B6B6B', opacity: 0.7 }}>
                          {block.catering_company}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBlock && (
        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#6B6B6B' }}>
          <span>🏠</span>
          <span>{selectedBlock.name} · {selectedBlock.catering_company || 'Unknown caterer'}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedId || submitting}
        className="mt-6 w-full rounded-2xl text-sm font-bold py-3.5 transition-all active:scale-95 disabled:opacity-40"
        style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(226,55,68,0.3)' }}
      >
        {submitting ? 'Setting up your mess…' : 'Confirm my block →'}
      </button>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i <= current ? '#E23744' : '#F0E6D3',
          }}
        />
      ))}
    </div>
  )
}

// ── Main onboarding page ──────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, updateBlock } = useUserContext()
  const { getToken } = useAuth()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.name || '')
  const [collegeId, setCollegeId] = useState(profile?.college_id || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Pre-fill from profile once loaded
  useEffect(() => {
    if (profile?.name && !name) setName(profile.name)
    if (profile?.college_id && !collegeId) setCollegeId(profile.college_id)
  }, [profile])

  const handleProfileNext = async () => {
    if (!name.trim()) return
    setSavingProfile(true)
    try {
      const token = await getToken()
      await api.updateMe(token, { name: name.trim(), college_id: collegeId.trim() || null })
    } catch {
      // Non-fatal: profile update failed, continue anyway
    } finally {
      setSavingProfile(false)
      setStep(1)
    }
  }

  const handleBlockSelect = async (blockId) => {
    await updateBlock(blockId)
    navigate('/dashboard', { replace: true })
  }

  const steps = [
    {
      emoji: '👋',
      heading: `Welcome${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!`,
      sub: "Let's set up your profile so we know what to show you.",
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1C1C1E' }}>Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ritwiz Kumar"
              className="w-full rounded-2xl text-sm px-4 py-3 outline-none transition-all"
              style={{
                background: '#FAFAFA',
                border: '1px solid #F0E6D3',
                color: '#1C1C1E',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#E23744')}
              onBlur={(e) => (e.target.style.borderColor = '#F0E6D3')}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1C1C1E' }}>College ID <span style={{ color: '#D1C4A8' }}>(optional)</span></label>
            <input
              type="text"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              placeholder="e.g. 22BCE1234"
              className="w-full rounded-2xl text-sm px-4 py-3 outline-none transition-all"
              style={{
                background: '#FAFAFA',
                border: '1px solid #F0E6D3',
                color: '#1C1C1E',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#E23744')}
              onBlur={(e) => (e.target.style.borderColor = '#F0E6D3')}
            />
          </div>
          <button
            onClick={handleProfileNext}
            disabled={!name.trim() || savingProfile}
            className="w-full rounded-2xl text-sm font-bold py-3.5 mt-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(226,55,68,0.3)' }}
          >
            {savingProfile ? 'Saving…' : 'Next →'}
          </button>
        </div>
      ),
    },
    {
      emoji: '🏠',
      heading: 'Which block are you in?',
      sub: 'Pick your hostel block and we\'ll automatically know your catering company.',
      content: <WarmBlockPicker onSelect={handleBlockSelect} />,
    },
  ]

  const current = steps[step]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 50%, #FFF3E0 100%)' }}
    >
      {/* Decorative blob */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: '#FFB830', transform: 'translate(40%, -40%)' }}
      />

      <div className="relative w-full max-w-sm">
        <ProgressDots total={steps.length} current={step} />

        <div
          className="rounded-3xl p-6"
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0E6D3',
            boxShadow: '0 8px 40px rgba(226,55,68,0.1)',
          }}
        >
          <div className="text-4xl mb-3">{current.emoji}</div>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: '#1C1C1E' }}>{current.heading}</h1>
          <p className="text-sm mb-5" style={{ color: '#6B6B6B' }}>{current.sub}</p>
          {current.content}
        </div>
      </div>
    </div>
  )
}
