const CACHE = 'messloo-v1'

// Pre-cache the app shell on install so it's available immediately offline
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // Cache both / and /index.html — Vite dev serves both
      fetch('/index.html')
        .then((res) => {
          c.put(new Request('/'), res.clone())
          c.put(new Request('/index.html'), res)
        })
        .catch(() => {}) // if offline at install time, skip
    ).then(() => self.skipWaiting())
  )
})

// Take control of all open tabs immediately
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip: non-GET, API calls, Clerk, Supabase, non-http
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('clerk')) return
  if (url.hostname.includes('supabase')) return
  if (!url.protocol.startsWith('http')) return

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Cache every successful response (JS, CSS, HTML, fonts, images)
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return res
      })
      .catch(async () => {
        // Offline: serve exact match from cache
        const cached = await caches.match(request)
        if (cached) return cached

        // For page navigations (hard reload / URL change), serve index.html
        // so React Router can boot and handle the route
        if (request.mode === 'navigate') {
          const shell =
            (await caches.match('/index.html')) ||
            (await caches.match('/'))
          if (shell) return shell
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' })
      })
  )
})
