import { useEffect, useState } from 'react'

const KEY = 'messloo_theme'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  // Keep document attribute in sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(KEY, next) } catch {}
      return next
    })
  }

  return { theme, toggle }
}
