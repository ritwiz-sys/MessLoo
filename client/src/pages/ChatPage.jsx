import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import BottomTabBar from '../components/BottomTabBar'

// ── Bubble message component ─────────────────────────────────────────────────
function Bubble({ role, content, sources }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const isUser = role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? { background: '#E23744', color: '#FFFFFF', borderBottomRightRadius: 6 }
            : { background: '#FFFFFF', color: '#1C1C1E', border: '1px solid #F0E6D3', borderBottomLeftRadius: 6 }
        }
      >
        {content}
      </div>

      {/* Sources accordion — assistant only */}
      {!isUser && sources && sources.length > 0 && (
        <div className="max-w-[80%]">
          <button
            onClick={() => setSourcesOpen((o) => !o)}
            className="text-[11px] font-semibold flex items-center gap-1 px-2"
            style={{ color: '#6B6B6B' }}
          >
            <span style={{ color: '#FFB830' }}>✦</span>
            {sourcesOpen ? 'Hide sources' : `${sources.length} source${sources.length > 1 ? 's' : ''}`}
            <span>{sourcesOpen ? '▲' : '▼'}</span>
          </button>
          {sourcesOpen && (
            <div
              className="mt-1 rounded-2xl p-3 flex flex-col gap-2"
              style={{ background: '#FFFBF0', border: '1px solid #F0E6D3' }}
            >
              {sources.map((src, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: '#6B6B6B' }}>
                  {src}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
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

// ── Conversation list view ────────────────────────────────────────────────────
function ConversationList({ conversations, loading, onSelect, onCreate }) {
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#1C1C1E' }}>Chat</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B6B6B' }}>Ask the mess AI anything</p>
          </div>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all active:scale-95"
            style={{ background: '#E23744', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(226,55,68,0.25)' }}
          >
            <span>+</span> New Chat
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: '#F5EDE4' }}
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">💬</span>
            <p className="text-base font-bold" style={{ color: '#1C1C1E' }}>No conversations yet</p>
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B6B6B' }}>Start a chat to ask about meals, specials, and more</p>
            <button
              onClick={onCreate}
              className="rounded-2xl px-5 py-2.5 text-sm font-bold active:scale-95"
              style={{ background: '#E23744', color: '#FFFFFF' }}
            >
              Start your first chat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className="w-full text-left rounded-2xl px-4 py-3 transition-all active:scale-95 flex items-center justify-between gap-3"
                style={{ background: '#FFFFFF', border: '1px solid #F0E6D3', boxShadow: '0 2px 8px rgba(226,55,68,0.05)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ background: '#FFE8EA' }}
                  >
                    💬
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1C1C1E' }}>
                      {conv.title || 'New conversation'}
                    </p>
                    <p className="text-xs" style={{ color: '#6B6B6B' }}>
                      {conv.updated_at
                        ? new Date(conv.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : 'Just now'}
                    </p>
                  </div>
                </div>
                <span style={{ color: '#D1C4A8', fontSize: 18 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────
function ChatView({ conversation, onBack }) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingMessages(true)
      try {
        const token = await getToken()
        const res = await api.getMessages(token, conversation.id)
        if (!cancelled) setMessages(res?.data || [])
      } catch { /* empty conv */ }
      finally { if (!cancelled) setLoadingMessages(false) }
    }
    load()
    return () => { cancelled = true }
  }, [conversation.id, getToken])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    const trimmed = question.trim()
    if (!trimmed || sending) return
    setQuestion('')
    setSending(true)
    setError(null)

    // Optimistic user bubble
    const tempUser = { id: Date.now(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, tempUser])

    try {
      const token = await getToken()
      const res = await api.sendMessage(token, conversation.id, trimmed)
      // Replace optimistic + add assistant
      const data = res?.data || {}
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempUser.id)
        const msgs = []
        if (data.user) msgs.push(data.user)
        else msgs.push({ ...tempUser, id: `u-${Date.now()}` })
        if (data.assistant) msgs.push(data.assistant)
        return [...without, ...msgs]
      })
    } catch (err) {
      setError(err.message || 'Failed to send')
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
    } finally {
      setSending(false)
    }
  }

  const SUGGESTIONS = ["What's for dinner today?", 'Any specials this week?', 'Is there chicken tomorrow?']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 pt-10 pb-4"
        style={{ borderBottom: '1px solid #F0E6D3', background: '#FFF8F0' }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-2xl transition-all active:scale-95"
          style={{ background: '#FFFFFF', border: '1px solid #F0E6D3' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19L8 12L15 5" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>
            {conversation.title || 'Chat'}
          </p>
          <p className="text-xs" style={{ color: '#6B6B6B' }}>Mess AI</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loadingMessages ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="w-48 h-10 rounded-2xl animate-pulse" style={{ background: '#F5EDE4' }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-4xl mb-3">🤖</span>
            <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>Ask me about the mess!</p>
            <p className="text-xs mt-1 mb-5" style={{ color: '#6B6B6B' }}>Try one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  className="rounded-full text-xs font-medium px-3 py-1.5 transition-all active:scale-95"
                  style={{ background: '#FFF0F1', color: '#E23744', border: '1px solid #FCCFD2' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
            />
          ))
        )}

        {sending && <TypingIndicator />}
        {error && (
          <p className="text-xs text-center" style={{ color: '#E23744' }}>{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="px-4 py-3"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #F0E6D3',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
        }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Ask about the mess…"
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: '#FFF8F0',
              border: '1px solid #F0E6D3',
              color: '#1C1C1E',
              maxHeight: 80,
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !question.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#E23744', boxShadow: '0 4px 12px rgba(226,55,68,0.3)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { getToken } = useAuth()
  const { blockCategory } = useUserContext()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // { id, title }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await api.getConversations(token)
        if (!cancelled) setConversations(res?.data || [])
      } catch { /* show empty state */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [getToken])

  const handleCreate = async () => {
    try {
      const token = await getToken()
      const res = await api.createConversation(token, {
        title: `Chat ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        block_category: blockCategory,
      })
      const conv = res?.data
      if (conv) {
        setConversations((prev) => [conv, ...prev])
        setSelected(conv)
      }
    } catch (err) {
      console.error('Failed to create conversation:', err.message)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg mx-auto"
      style={{ background: '#FFF8F0' }}
    >
      {selected ? (
        <ChatView
          conversation={selected}
          onBack={() => setSelected(null)}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          loading={loading}
          onSelect={setSelected}
          onCreate={handleCreate}
        />
      )}

      {!selected && <BottomTabBar />}
    </div>
  )
}
