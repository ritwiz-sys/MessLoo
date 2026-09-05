import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'

const APP_URL = 'https://messloo.netlify.app'

const FEATURES = [
  { emoji: '🍱', label: "Today's Menu" },
  { emoji: '🤖', label: 'AI Chat' },
  { emoji: '📱', label: 'Works Offline' },
]

const INSTALL_STEPS = [
  {
    platform: '🤖 Android',
    steps: ['Open the link in Chrome', 'Tap ⋮ (three dots) → "Add to Home Screen"', 'Tap "Add"'],
  },
  {
    platform: '🍎 iPhone',
    steps: ['Open the link in Safari', 'Tap the Share icon (□↑)', 'Tap "Add to Home Screen" → "Add"'],
  },
]

export default function InvitePage() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [shareState, setShareState] = useState('idle') // idle | copied

  async function handleShare() {
    const data = {
      title: 'MessLoo — VIT-AP Mess App',
      text: "Check out MessLoo! Today's mess menu, AI chat, and it works offline.",
      url: APP_URL,
    }
    if (navigator.share) {
      try { await navigator.share(data) } catch {}
    } else {
      await navigator.clipboard.writeText(APP_URL)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'var(--bg-gradient)' }}
    >
      {/* Theme toggle — top right */}
      <div className="flex justify-end px-5 pt-5">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'var(--toggle-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: 'var(--card-border)',
            fontSize: 17,
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <main className="flex flex-col items-center px-5 pb-16 max-w-sm mx-auto w-full" style={{ paddingTop: 32 }}>

        {/* Logo + Title */}
        <div
          className="flex items-center justify-center rounded-3xl mb-4"
          style={{
            width: 88,
            height: 88,
            background: '#E23744',
            boxShadow: '0 12px 32px rgba(226,55,68,0.30)',
            fontSize: 42,
          }}
        >
          🍽️
        </div>

        <h1
          className="text-center"
          style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          MessLoo
        </h1>
        <p
          className="mt-2 text-center"
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          Your VIT-AP mess, simplified.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {FEATURES.map(({ emoji, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                border: 'var(--card-border)',
                color: 'var(--text-primary)',
              }}
            >
              {emoji} {label}
            </span>
          ))}
        </div>

        {/* QR code */}
        <div
          className="mt-8 rounded-2xl overflow-hidden p-3 flex items-center justify-center"
          style={{
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(APP_URL)}&color=E23744&bgcolor=ffffff`}
            alt={`QR code for ${APP_URL}`}
            width={180}
            height={180}
            style={{ display: 'block' }}
          />
        </div>
        <p
          className="mt-2 text-center text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Scan to open
        </p>

        {/* CTA */}
        <a
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 w-full flex items-center justify-center rounded-2xl text-white font-black text-base transition-all active:scale-95"
          style={{
            background: '#E23744',
            boxShadow: '0 8px 24px rgba(226,55,68,0.30)',
            height: 56,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}
        >
          Install MessLoo →
        </a>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="mt-3 w-full flex items-center justify-center rounded-2xl font-bold text-sm transition-all active:scale-95"
          style={{
            height: 48,
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: 'var(--card-border)',
            color: 'var(--text-primary)',
          }}
        >
          {shareState === 'copied' ? '✅ Link copied!' : '🔗 Share with friends'}
        </button>

        {/* Email note */}
        <p
          className="mt-5 text-center text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Sign in with any email to get started
        </p>

        {/* Install instructions */}
        <div className="mt-8 w-full flex flex-col gap-3">
          <h2
            className="text-center text-sm font-black uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}
          >
            How to Install
          </h2>
          {INSTALL_STEPS.map(({ platform, steps }) => (
            <div
              key={platform}
              className="rounded-2xl px-4 py-4"
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                border: 'var(--card-border)',
              }}
            >
              <p className="font-black text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                {platform}
              </p>
              <ol className="flex flex-col gap-1">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span
                      className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-black"
                      style={{ width: 18, height: 18, background: '#E23744', fontSize: 10, marginTop: 1 }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="mt-10 text-center text-xs font-semibold"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          Made with ❤️ for VIT-AP
        </p>
      </main>
    </div>
  )
}
