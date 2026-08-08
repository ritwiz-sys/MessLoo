import { useState } from 'react'
import { useAuth } from '../lib/clerk'
import { api } from '../lib/api'

const SUGGESTIONS = [
  'Is there chicken this week?',
  "What's for dinner tomorrow?",
  'Any special meals this week?',
]

export default function ChatSection() {
  const { getToken } = useAuth()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ask = async (q) => {
    const trimmed = (q ?? question).trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setAnswer(null)
    setSources([])

    try {
      const token = await getToken()
      const res = await api.askChat(token, trimmed)
      setAnswer(res?.answer || "I couldn't find an answer to that.")
      setSources(res?.sources || [])
    } catch (err) {
      setError(err.message || 'Something went wrong asking that question')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    ask()
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#15151c] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h2 className="text-base font-semibold text-gray-100">Ask about the mess menu</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        Ask anything about this week's menu — specials, ingredients, what's coming up.
      </p>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuestion(s)
              ask(s)
            }}
            disabled={loading}
            className="rounded-full border border-white/10 hover:bg-white/5 disabled:opacity-50 text-gray-400 text-xs px-3 py-1.5 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Is there chicken this week?"
          disabled={loading}
          className="flex-1 rounded-lg border border-white/10 bg-[#0b0b10] text-gray-100 text-sm placeholder:text-gray-600 px-3 py-2.5 outline-none focus:border-purple-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black text-sm font-medium px-4 py-2.5 transition-colors"
        >
          {loading ? 'Asking…' : 'Send'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse [animation-delay:300ms]" />
          <span>Thinking…</span>
        </div>
      )}

      {!loading && answer && (
        <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-4 flex flex-col gap-3">
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
          {sources.length > 0 && (
            <div className="pt-3 border-t border-white/5 flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-gray-600">Sources</span>
              {sources.map((src, i) => (
                <p key={i} className="text-xs text-gray-500 leading-relaxed">
                  {src}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
