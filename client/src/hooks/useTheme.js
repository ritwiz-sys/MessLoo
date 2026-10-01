import { useEffect, useState } from 'react'

const KEY = 'messloo_theme'

// ── Module-level shared state ─────────────────────────────────────────────────
// All components calling useTheme() share ONE theme value.
// When toggle() fires, every subscriber re-renders instantly — no reload needed.

const listeners = new Set()

let currentTheme = (() => {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
})()

function setGlobalTheme(next) {
  currentTheme = next
  try { localStorage.setItem(KEY, next) } catch {}
  document.documentElement.setAttribute('data-theme', next)
  listeners.forEach(fn => fn(next))
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)

  useEffect(() => {
    // Subscribe: receive updates from any other component that calls toggle()
    listeners.add(setTheme)
    return () => listeners.delete(setTheme)
  }, [])

  // Sync data-theme on first mount (covers components that mount after toggle)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => setGlobalTheme(currentTheme === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
