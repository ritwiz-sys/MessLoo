import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from './lib/clerk'
import OfflineFallback from './pages/OfflineFallback.jsx'

// Register service worker for offline shell caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')

// If offline, render a Clerk-free fallback that reads from localStorage cache.
// Clerk always tries to fetch its SDK from its CDN — this crashes the app offline.
const isOffline = !navigator.onLine

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isOffline ? (
      <BrowserRouter>
        <OfflineFallback />
      </BrowserRouter>
    ) : (
      <ClerkProvider publishableKey={publishableKey} signInUrl="/login" afterSignOutUrl="/login">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    )}
  </StrictMode>,
)
