import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/react'
import { api } from '../lib/api'
import BottomTabBar from '../components/BottomTabBar'

// ── Suggestion chips shown when chat is empty ─────────────────────────────────
const SUGGESTIONS = [
  "What's for dinner today?",
  'Any specials this week?',
  'Is there chicken tomorrow?',
  "What's the breakfast menu?",
  'Which block has better food?',
]

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
        style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', borderBottomLeftRadius: 6 }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#D1C4A8', animationDelay: `${delay}ms` }}
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
                background: '#FFFFFF',
                color: '#1C1C1E',
                border: '1px solid #F0E6D3',
                borderBottomLeftRadius: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
  const [messages, setMessages] = useState([])   // { id, role, content, sources? }
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async (text) => {
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
      const answer = res?.data?.answer || res?.answer || res?.response || 'Sorry, I couldn\'t get a response.'
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
      // Refocus input after send
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg mx-auto"
      style={{ background: '#FFF8F0' }}
    >
      {/* ── Header ── */}
      <header
        className="px-4 pt-10 pb-4 shrink-0"
        style={{
          background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 100%)',
          borderBottom: '1px solid #F0E6D3',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: '#FFE8EA' }}
          >
            🤖
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight" style={{ color: '#1C1C1E' }}>
              Mess AI
            </h1>
            <p className="text-xs" style={{ color: '#6B6B6B' }}>Ask me anything about the menu</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ background: '#F5EDE4', color: '#6B6B6B' }}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Welcome / suggestion chips */}
        {isEmpty && (
          <div className="flex flex-col items-center pt-6 pb-2 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl mb-4"
              style={{ background: '#FFE8EA', boxShadow: '0 4px 20px rgba(226,55,68,0.15)' }}
            >
              🍱
            </div>
            <p className="text-base font-extrabold mb-1" style={{ color: '#1C1C1E' }}>
              What can I help with?
            </p>
            <p className="text-sm mb-5" style={{ color: '#6B6B6B' }}>
              Ask about meals, specials, ingredients, or schedules.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full text-xs font-semibold px-4 py-2 transition-all active:scale-95"
                  style={{
                    background: '#FFFFFF',
                    color: '#E23744',
                    border: '1px solid #FCCFD2',
                    boxShadow: '0 2px 8px rgba(226,55,68,0.08)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <Bubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {sending && <TypingIndicator />}

        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm text-center"
            style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}
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

      {/* ── Input bar ── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #F0E6D3',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        <div
          className="flex gap-2 items-end rounded-2xl px-3 py-2"
          style={{ background: '#FFF8F0', border: '1px solid #F0E6D3' }}
        >
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Ask about the mess menu…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1"
            style={{
              color: '#1C1C1E',
              maxHeight: 96,
              lineHeight: '1.5',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !question.trim()}
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
