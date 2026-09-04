import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/clerk'
import { api } from '../lib/api'
import BottomTabBar from '../components/BottomTabBar'

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's for dinner tonight?",
  "What's for breakfast tomorrow?",
  'Is there chicken today?',
  "What's for lunch today?",
  "Any paneer dishes this week?",
]

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
        style={{
          background: 'var(--dish-odd)',
          border: '1px solid var(--dish-border)',
          borderBottomLeftRadius: 6,
        }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: 'var(--text-muted)', animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, #E23744, #C0392B)',
                color: '#FFFFFF',
                borderBottomRightRadius: 6,
                boxShadow: '0 2px 10px rgba(226,55,68,0.25)',
              }
            : {
                background: 'var(--dish-odd)',
                color: 'var(--dish-text)',
                border: '1px solid var(--dish-border)',
                borderBottomLeftRadius: 6,
              }
        }
      >
        {content}
      </div>
    </div>
  )
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async (text) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. AI Chat is not available offline.')
      return
    }
    const trimmed = (text ?? question).trim()
    if (!trimmed || sending) return
    setQuestion('')
    setSending(true)
    setError(null)

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])

    try {
      const token = await getToken()
      const res = await api.askChat(token, trimmed)
      const answer = res?.data?.answer || res?.answer || res?.response || "Sorry, I couldn't get a response."
      const sources = res?.data?.sources || res?.sources || []
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: answer, sources },
      ])
    } catch (err) {
      setError(err.message || 'Failed to get a response. Try again.')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const isEmpty = messages.length === 0
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg mx-auto"
      style={{ background: 'transparent' }}
    >
      {/* ── Header ── */}
      <header
        className="px-4 pb-4 shrink-0"
        style={{
          paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 10px))',
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--dish-border)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* AI logo — no emoji, pure SVG */}
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)', boxShadow: '0 4px 14px rgba(99,58,237,0.35)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.15)" />
              <path d="M9 9h1.5M13.5 9H15M9 14.5c0 0 .75 1.5 3 1.5s3-1.5 3-1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9.75" cy="9" r="1" fill="white" />
              <circle cx="14.25" cy="9" r="1" fill="white" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Mess AI
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ask anything about your mess</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ background: 'var(--toggle-bg)', color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ paddingBottom: 160 }}>
        {offline && (
          <div
            className="rounded-2xl p-3 text-xs font-semibold flex items-center gap-2"
            style={{ background: 'var(--offline-bg)', color: 'var(--offline-color)', border: '1px solid var(--offline-border)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--offline-color)' }} />
            Offline Mode: AI Chat is unavailable while offline.
          </div>
        )}

        {/* Welcome / suggestion chips */}
        {isEmpty && (
          <div className="flex flex-col items-center pt-6 pb-2 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)', boxShadow: '0 8px 28px rgba(99,58,237,0.30)' }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.15)" />
                <path d="M9 9h1.5M13.5 9H15M9 14.5c0 0 .75 1.5 3 1.5s3-1.5 3-1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="9.75" cy="9" r="1" fill="white" />
                <circle cx="14.25" cy="9" r="1" fill="white" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-base font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
              What can I help with?
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Ask about today's meals, ingredients, or upcoming menus.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={offline ? null : () => handleSend(s)}
                  disabled={offline}
                  className="rounded-full text-xs font-semibold px-4 py-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--dish-odd)',
                    color: offline ? 'var(--text-muted)' : 'var(--tab-active)',
                    border: '1px solid var(--dish-border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <Bubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {sending && <TypingIndicator />}

        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm text-center"
            style={{ background: 'var(--error-bg)', color: 'var(--error-color)', border: '1px solid var(--error-border)' }}
          >
            {error}
            <button
              className="block mx-auto mt-1 text-xs font-semibold underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar — fixed, sits above the floating pill tab bar ── */}
      <div
        className="fixed left-0 right-0 px-4 z-40"
        style={{ bottom: 'max(88px, calc(env(safe-area-inset-bottom, 0px) + 80px))' }}
      >
        <div
          className="flex gap-2 items-end rounded-2xl px-3 py-2 max-w-lg mx-auto"
          style={{
            background: 'var(--modal-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--input-border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
          }}
        >
          <textarea
            ref={inputRef}
            value={question}
            disabled={offline}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={offline ? 'AI Chat is offline…' : 'Ask about the mess menu…'}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1 disabled:opacity-50"
            style={{ color: 'var(--text-primary)', maxHeight: 96, lineHeight: '1.5' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !question.trim() || offline}
            className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#E23744', boxShadow: '0 3px 10px rgba(226,55,68,0.3)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <BottomTabBar />
    </div>
  )
}
