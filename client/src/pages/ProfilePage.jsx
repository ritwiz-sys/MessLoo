import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { UserButton } from '@clerk/react'
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
function AddDishInput({ type, onAdd, loading }) {
  const [value, setValue] = useState('')
  const submit = () => {
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
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={type === 'like' ? 'e.g. chicken curry' : 'e.g. bitter gourd'}
        className="flex-1 rounded-2xl text-xs px-3 py-2 outline-none"
        style={{ background: '#FAFAFA', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
      />
      <button
        onClick={submit}
        disabled={!value.trim() || loading}
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
      style={{ background: 'rgba(28,28,30,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0E6D3' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: '#1C1C1E' }}>Submit Feedback</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: '#F5EDE4', color: '#6B6B6B' }}
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
                  : { background: '#F5EDE4', color: '#6B6B6B' }
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
          style={{ background: '#FFF8F0', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
        />

        {error && <p className="text-xs" style={{ color: '#E23744' }}>{error}</p>}

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

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { getToken } = useAuth()
  const { profile, blockName, cateringCompany, refetch } = useUserContext()

  const [preferences, setPreferences] = useState({ liked_dishes: [], disliked_dishes: [] })
  const [feedbackList, setFeedbackList] = useState([])
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [prefSaving, setPrefSaving] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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
      try {
        const token = await getToken()
        const [prefsRes, feedRes] = await Promise.all([
          api.getPreferences(token),
          api.getFeedback(token),
        ])
        if (!cancelled) {
          setPreferences({
            liked_dishes: prefsRes?.data?.liked_dishes || [],
            disliked_dishes: prefsRes?.data?.disliked_dishes || [],
          })
          setFeedbackList(feedRes?.data || [])
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
    setPrefSaving(true)
    try {
      const token = await getToken()
      const res = await api.likeDish(token, dishName)
      if (res?.data) setPreferences(res.data)
    } catch { /* ignore */ }
    finally { setPrefSaving(false) }
  }

  const handleDislike = async (dishName) => {
    setPrefSaving(true)
    try {
      const token = await getToken()
      const res = await api.dislikeDish(token, dishName)
      if (res?.data) setPreferences(res.data)
    } catch { /* ignore */ }
    finally { setPrefSaving(false) }
  }

  const handleSaveProfile = async () => {
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
    const token = await getToken()
    const res = await api.submitFeedback(token, body)
    if (res?.data) setFeedbackList((prev) => [res.data, ...prev])
  }

  const STATUS_COLORS = {
    open: { bg: '#FFF0F1', text: '#E23744' },
    in_progress: { bg: '#FFF8E1', text: '#FF8C00' },
    resolved: { bg: '#E8FAF0', text: '#2ECC71' },
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF8F0' }}>
      {/* ── Header ── */}
      <header
        className="px-4 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 100%)' }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <UserButton
            appearance={{
              elements: { userButtonAvatarBox: 'w-14 h-14' },
            }}
          />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold truncate" style={{ color: '#1C1C1E' }}>
              {profile?.name || 'My Profile'}
            </h1>
            {profile?.college_id && (
              <p className="text-sm" style={{ color: '#6B6B6B' }}>{profile.college_id}</p>
            )}
            {blockName && (
              <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FFE8EA', color: '#E23744' }}>
                🏠 {blockName}{cateringCompany ? ` · ${cateringCompany}` : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 max-w-lg mx-auto w-full">

        {/* ── Edit profile card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-4"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 8px rgba(226,55,68,0.05)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: '#1C1C1E' }}>Profile Details</h2>
            <button
              onClick={() => setEditing((e) => !e)}
              className="text-xs font-semibold"
              style={{ color: '#E23744' }}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#6B6B6B' }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl text-sm px-3 py-2.5 outline-none"
                  style={{ background: '#FFF8F0', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#6B6B6B' }}>College ID</label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  className="w-full rounded-2xl text-sm px-3 py-2.5 outline-none"
                  style={{ background: '#FFF8F0', border: '1px solid #F0E6D3', color: '#1C1C1E' }}
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
            <div className="flex flex-col gap-1.5 text-sm" style={{ color: '#1C1C1E' }}>
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

        {/* ── Preferences card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-3"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 8px rgba(226,55,68,0.05)' }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: '#1C1C1E' }}>Food Preferences</h2>

          {loadingPrefs ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-6 rounded-full w-24 animate-pulse" style={{ background: '#F5EDE4' }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: '#6B6B6B' }}>👍 Liked dishes</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.liked_dishes.length === 0 ? (
                    <p className="text-xs italic" style={{ color: '#D1C4A8' }}>None added yet</p>
                  ) : (
                    preferences.liked_dishes.map((d) => (
                      <DishChip key={d} name={d} type="like" />
                    ))
                  )}
                </div>
                <AddDishInput type="like" onAdd={handleLike} loading={prefSaving} />
              </div>

              <div style={{ borderTop: '1px solid #F0E6D3', paddingTop: 12 }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#6B6B6B' }}>👎 Disliked dishes</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.disliked_dishes.length === 0 ? (
                    <p className="text-xs italic" style={{ color: '#D1C4A8' }}>None added yet</p>
                  ) : (
                    preferences.disliked_dishes.map((d) => (
                      <DishChip key={d} name={d} type="dislike" />
                    ))
                  )}
                </div>
                <AddDishInput type="dislike" onAdd={handleDislike} loading={prefSaving} />
              </div>
            </div>
          )}
        </section>

        {/* ── Feedback card ── */}
        <section
          className="rounded-2xl px-4 py-4 mt-3"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 8px rgba(226,55,68,0.05)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: '#1C1C1E' }}>My Feedback</h2>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-full active:scale-95"
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
              <p className="text-sm" style={{ color: '#6B6B6B' }}>No feedback submitted yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {feedbackList.slice(0, 5).map((fb) => {
                const colors = STATUS_COLORS[fb.status] || STATUS_COLORS.open
                return (
                  <div
                    key={fb.id}
                    className="rounded-2xl px-3 py-3"
                    style={{ background: '#FAFAFA', border: '1px solid #F0E6D3' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold capitalize" style={{ color: '#1C1C1E' }}>
                        {fb.category?.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {fb.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#6B6B6B' }}>
                      {fb.message}
                    </p>
                    {fb.created_at && (
                      <p className="text-[10px] mt-1" style={{ color: '#D1C4A8' }}>
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
