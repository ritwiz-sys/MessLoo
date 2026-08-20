import { useEffect, useMemo, useState } from 'react'
import { useAuth, UserButton } from '../lib/clerk'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import BottomTabBar from '../components/BottomTabBar'

// ── Dish chip ─────────────────────────────────────────────────────────────────
function DishChip({ name, type, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      style={
        type === 'like'
          ? { background: '#E8FAF0', color: '#2ECC71', border: '1px solid #BFF0D4' }
          : { background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }
      }
    >
      {type === 'like' ? '👍' : '👎'} {name}
      {onRemove && (
        <button onClick={() => onRemove(name)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
      )}
    </span>
  )
}

// ── Add dish input ─────────────────────────────────────────────────────────────
function AddDishInput({ type, onAdd, loading, disabled }) {
  const [value, setValue] = useState('')
  const submit = () => {
    if (disabled) return
    const v = value.trim()
    if (!v) return
    onAdd(v)
    setValue('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={disabled ? "Offline..." : (type === 'like' ? 'e.g. chicken curry' : 'e.g. bitter gourd')}
        className="flex-1 rounded-2xl text-xs px-3 py-2 outline-none disabled:opacity-50"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
      <button
        onClick={submit}
        disabled={!value.trim() || loading || disabled}
        className="rounded-2xl px-3 py-2 text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
        style={
          type === 'like'
            ? { background: '#E8FAF0', color: '#2ECC71', border: '1px solid #BFF0D4' }
            : { background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }
        }
      >
        + Add
      </button>
    </div>
  )
}

// ── Feedback modal ────────────────────────────────────────────────────────────
function FeedbackModal({ onClose, onSubmit }) {
  const [category, setCategory] = useState('food_quality')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const CATEGORIES = [
    { value: 'food_quality', label: '🍽️ Food quality' },
    { value: 'hygiene', label: '🧼 Hygiene' },
    { value: 'service', label: '🙋 Service' },
    { value: 'suggestion', label: '💡 Suggestion' },
    { value: 'other', label: '📝 Other' },
  ]

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ category, message: message.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-4"
        style={{
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--modal-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Submit Feedback</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: 'var(--toggle-bg)', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={
                category === cat.value
                  ? { background: '#E23744', color: '#FFFFFF' }
                  : { background: 'var(--toggle-bg)', color: 'var(--text-muted)' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you think…"
          rows={4}
          className="w-full rounded-2xl text-sm px-4 py-3 resize-none outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        />

        {error && <p className="text-xs" style={{ color: 'var(--error-color)' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="w-full rounded-2xl py-3 text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
          style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
        >
          {submitting ? 'Submitting…' : 'Send Feedback'}
        </button>
      </div>
    </div>
  )
}

// ── Block picker sheet ────────────────────────────────────────────────────────
function BlockSheet({ currentBlockId, onClose, onConfirm }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(currentBlockId || null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
      if (!map[cat]) map[cat] = []
      map[cat].push(b)
    }
    return map
  }, [blocks])

  const categories = Object.keys(grouped).sort()
  const selectedBlock = blocks.find((b) => b.id === selectedId)

  const handleConfirm = async () => {
    if (!selectedId || selectedId === currentBlockId) { onClose(); return }
    setSaving(true)
    try {
      await onConfirm(selectedId)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save block')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--modal-border)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Change Block</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: 'var(--toggle-bg)', color: 'var(--text-muted)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable block list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {error && (
            <div className="rounded-2xl p-3 mb-3 text-xs font-medium" style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}>
              {error}
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-3 gap-2 py-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--toggle-bg)' }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-1">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{cat}</p>
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
                            background: active ? '#FFF0F1' : 'var(--dish-odd)',
                            border: active ? '2px solid #E23744' : 'var(--card-border)',
                            color: active ? '#E23744' : 'var(--text-primary)',
                          }}
                        >
                          <span className="text-sm font-bold">{block.name || block.block_name}</span>
                          {block.catering_company && (
                            <span className="text-[10px] font-medium mt-0.5" style={{ color: active ? '#E23744' : 'var(--text-muted)', opacity: 0.8 }}>
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
        </div>

        {/* Footer */}
        <div className="px-5 pb-10 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--modal-border)' }}>
          {selectedBlock && (
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              🏠 {selectedBlock.name}{selectedBlock.catering_company ? ` · ${selectedBlock.catering_company}` : ''}
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selectedId || saving}
            className="w-full rounded-2xl py-3 text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
            style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(226,55,68,0.25)' }}
          >
            {saving ? 'Saving…' : selectedId === currentBlockId ? 'Keep current block' : 'Confirm block →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { getToken } = useAuth()
  const { profile, blockName, cateringCompany, updateBlock, refetch } = useUserContext()

  const [preferences, setPreferences] = useState({ liked_dishes: [], disliked_dishes: [] })
  const [feedbackList, setFeedbackList] = useState([])
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [prefSaving, setPrefSaving] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [blockSheetOpen, setBlockSheetOpen] = useState(false)

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editId, setEditId] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '')
      setEditId(profile.college_id || '')
    }
  }, [profile])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Offline fallback
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const cachedPrefs = localStorage.getItem('messloo_user_preferences')
          if (cachedPrefs) {
            setPreferences(JSON.parse(cachedPrefs))
          }
          const cachedFeed = localStorage.getItem('messloo_user_feedback')
          if (cachedFeed) {
            setFeedbackList(JSON.parse(cachedFeed))
          }
        } catch (e) {
          console.error('Failed to load profile details offline', e)
        }
        if (!cancelled) {
          setLoadingPrefs(false)
          setLoadingFeedback(false)
        }
        return
      }

      try {
        const token = await getToken()
        const [prefsRes, feedRes] = await Promise.all([
          api.getPreferences(token),
          api.getFeedback(token),
        ])
        if (!cancelled) {
          const prefs = {
            liked_dishes: prefsRes?.data?.liked_dishes || [],
            disliked_dishes: prefsRes?.data?.disliked_dishes || [],
          }
          const feedback = feedRes?.data || []
          setPreferences(prefs)
          setFeedbackList(feedback)
          try {
            localStorage.setItem('messloo_user_preferences', JSON.stringify(prefs))
            localStorage.setItem('messloo_user_feedback', JSON.stringify(feedback))
          } catch (e) {
            console.error('Failed to write preferences cache', e)
          }
        }
      } catch { /* not critical */ }
      finally {
        if (!cancelled) { setLoadingPrefs(false); setLoadingFeedback(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken])

  const handleLike = async (dishName) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    setPrefSaving(true)
    try {
      const token = await getToken()
      const res = await api.likeDish(token, dishName)
      if (res?.data) {
        setPreferences(res.data)
        try {
          localStorage.setItem('messloo_user_preferences', JSON.stringify(res.data))
        } catch {}
      }
    } catch { /* ignore */ }
    finally { setPrefSaving(false) }
  }

  const handleDislike = async (dishName) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    setPrefSaving(true)
    try {
      const token = await getToken()
      const res = await api.dislikeDish(token, dishName)
      if (res?.data) {
        setPreferences(res.data)
        try {
          localStorage.setItem('messloo_user_preferences', JSON.stringify(res.data))
        } catch {}
      }
    } catch { /* ignore */ }
    finally { setPrefSaving(false) }
  }

  const handleSaveProfile = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (!editName.trim()) return
    setSavingProfile(true)
    try {
      const token = await getToken()
      await api.updateMe(token, { name: editName.trim(), college_id: editId.trim() || null })
      await refetch()
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSavingProfile(false) }
  }

  const handleSubmitFeedback = async (body) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const token = await getToken()
    const res = await api.submitFeedback(token, body)
    if (res?.data) {
      setFeedbackList((prev) => {
        const newList = [res.data, ...prev]
        try {
          localStorage.setItem('messloo_user_feedback', JSON.stringify(newList))
        } catch {}
        return newList
      })
    }
  }

  const STATUS_COLORS = {
    open: { bg: '#FFF0F1', text: '#E23744' },
    in_progress: { bg: '#FFF8E1', text: '#FF8C00' },
    resolved: { bg: '#E8FAF0', text: '#2ECC71' },
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      {/* ── Header ── */}
      <header
        className="px-4 pb-5"
        style={{
          paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 10px))',
          background: 'transparent',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-14 h-14' } }} />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
              {profile?.name || 'My Profile'}
            </h1>
            {profile?.college_id && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile.college_id}</p>
            )}
            {blockName && (
              <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--pill-bg)', color: 'var(--pill-color)', border: '1px solid var(--pill-border)' }}>
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 max-w-lg mx-auto w-full">
        {typeof navigator !== 'undefined' && !navigator.onLine && (
          <div 
            className="mb-4 rounded-2xl p-3 text-xs font-semibold flex items-center gap-2 mt-4"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#92610A', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
            Offline Mode: Showing cached profile and settings. Writes are disabled.
          </div>
        )}

        {/* ── Edit profile card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-4"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--dish-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Profile Details</h2>
            <button
              onClick={typeof navigator !== 'undefined' && !navigator.onLine ? null : () => setEditing((e) => !e)}
              disabled={typeof navigator !== 'undefined' && !navigator.onLine}
              className="text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: '#E23744' }}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl text-sm px-3 py-2.5 outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>College ID</label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  className="w-full rounded-2xl text-sm px-3 py-2.5 outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!editName.trim() || savingProfile}
                className="w-full rounded-2xl py-2.5 text-sm font-bold disabled:opacity-40 active:scale-95"
                style={{ background: '#E23744', color: '#FFFFFF' }}
              >
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: '#6B6B6B', fontSize: 12 }}>Name</span>
                <span className="font-semibold">{profile?.name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: '#6B6B6B', fontSize: 12 }}>ID</span>
                <span className="font-semibold">{profile?.college_id || '—'}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Block card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-3"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--dish-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Your Block</h2>
            <button
              onClick={typeof navigator !== 'undefined' && !navigator.onLine ? null : () => setBlockSheetOpen(true)}
              disabled={typeof navigator !== 'undefined' && !navigator.onLine}
              className="text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: '#E23744' }}
            >
              Change
            </button>
          </div>
          <div className="mt-2">
            {blockName ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'var(--dish-odd)', border: 'var(--card-border)', color: 'var(--text-primary)' }}
              >
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </span>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No block set</p>
            )}
          </div>
        </section>

        {/* ── Preferences card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-3"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--dish-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)' }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Food Preferences</h2>

          {loadingPrefs ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-6 rounded-full w-24 animate-pulse" style={{ background: '#F5EDE4' }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>👍 Liked dishes</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.liked_dishes.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>None added yet</p>
                  ) : (
                    preferences.liked_dishes.map((d) => (
                      <DishChip key={d} name={d} type="like" />
                    ))
                  )}
                </div>
                 <AddDishInput type="like" onAdd={handleLike} loading={prefSaving} disabled={typeof navigator !== 'undefined' && !navigator.onLine} />
              </div>

              <div style={{ borderTop: '1px solid #F0E6D3', paddingTop: 12 }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>👎 Disliked dishes</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.disliked_dishes.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>None added yet</p>
                  ) : (
                    preferences.disliked_dishes.map((d) => (
                      <DishChip key={d} name={d} type="dislike" />
                    ))
                  )}
                </div>
                 <AddDishInput type="dislike" onAdd={handleDislike} loading={prefSaving} disabled={typeof navigator !== 'undefined' && !navigator.onLine} />
              </div>
            </div>
          )}
        </section>

        {/* ── Feedback card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-3"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--dish-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>My Feedback</h2>
            <button
              onClick={typeof navigator !== 'undefined' && !navigator.onLine ? null : () => setFeedbackOpen(true)}
              disabled={typeof navigator !== 'undefined' && !navigator.onLine}
              className="text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#FFE8EA', color: '#E23744' }}
            >
              + Submit
            </button>
          </div>

          {loadingFeedback ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-2xl animate-pulse" style={{ background: '#F5EDE4' }} />
              ))}
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="py-6 text-center">
              <span className="text-3xl block mb-2">📬</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No feedback submitted yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {feedbackList.slice(0, 5).map((fb) => {
                const colors = STATUS_COLORS[fb.status] || STATUS_COLORS.open
                return (
                  <div
                    key={fb.id}
                    className="rounded-2xl px-3 py-3"
                    style={{ background: 'var(--dish-odd)', border: '1px solid var(--dish-border)' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {fb.category?.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {fb.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {fb.message}
                    </p>
                    {fb.created_at && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {blockSheetOpen && (
        <BlockSheet
          currentBlockId={profile?.block_id}
          onClose={() => setBlockSheetOpen(false)}
          onConfirm={async (blockId) => {
            await updateBlock(blockId)
            await refetch()
          }}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal
          onClose={() => setFeedbackOpen(false)}
          onSubmit={handleSubmitFeedback}
        />
      )}

      <BottomTabBar />
    </div>
  )
}
