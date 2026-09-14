import { getSession, getUserId } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// ── Response cache (menus + predictions) ──────────────────────────────────────
// Two-tier: in-memory Map for the current tab session (instant),
// localStorage for persistence across navigations (5-min TTL).
const MEM_CACHE  = new Map()
const CACHE_TTL  = 5 * 60 * 1000   // 5 minutes

function lsGet(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function lsSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

/** Fetch with caching. `cacheKey` opts in; omit to skip. */
async function cachedFetch(cacheKey, fetcher) {
  if (cacheKey) {
    if (MEM_CACHE.has(cacheKey)) return MEM_CACHE.get(cacheKey)
    const lsCached = lsGet(cacheKey)
    if (lsCached !== null) { MEM_CACHE.set(cacheKey, lsCached); return lsCached }
  }
  const result = await fetcher()
  if (cacheKey) { MEM_CACHE.set(cacheKey, result); lsSet(cacheKey, result) }
  return result
}

/** Invalidate a cache key (call after admin POSTs a menu). */
export function invalidateCache(cacheKey) {
  MEM_CACHE.delete(cacheKey)
  try { localStorage.removeItem(cacheKey) } catch {}
}

function buildHeaders(extra = {}) {
  const session = getSession()
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': getUserId(),
    'x-block': session?.block || 'MH',
    ...extra,
  }
  if (session?.role === 'admin' && session?.adminToken) {
    headers['Authorization'] = `Bearer ${session.adminToken}`
  }
  return headers
}

export async function apiFetch(path, options = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are offline. Please check your internet connection.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })

  let payload = null
  try { payload = await response.json() } catch { payload = null }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const api = {
  getBlocks: () => apiFetch('/blocks'),

  getMenus: ({ date, block_category, menu_type }) => {
    let url = `/menus?date=${encodeURIComponent(date)}&block_category=${encodeURIComponent(block_category)}`
    if (menu_type) url += `&menu_type=${encodeURIComponent(menu_type)}`
    const cacheKey = `api_menus_${date}_${block_category}_${menu_type || 'all'}`
    return cachedFetch(cacheKey, () => apiFetch(url))
  },

  addMenu: (body) => apiFetch('/menus', { method: 'POST', body: JSON.stringify(body) }),

  markAttendance: (body) => apiFetch('/attendance', { method: 'POST', body: JSON.stringify(body) }),

  getAttendance: ({ menu_id }) =>
    apiFetch(`/attendance?menu_id=${encodeURIComponent(menu_id)}`),

  getAttendanceSummary: (menuId) =>
    apiFetch(`/attendance/summary?menu_id=${encodeURIComponent(menuId)}`),

  addBlock: (body) => apiFetch('/blocks', { method: 'POST', body: JSON.stringify(body) }),

  updateBlock: (id, body) =>
    apiFetch(`/blocks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteBlock: (id) =>
    apiFetch(`/blocks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  askChat: (question) =>
    apiFetch('/chat', { method: 'POST', body: JSON.stringify({ question }) }),

  getPredictionsToday: () => {
    const today = new Date().toISOString().slice(0, 10)
    return cachedFetch(`api_predict_${today}`, () => apiFetch('/predict/today'))
  },

  getConversations: () => apiFetch('/conversations'),

  createConversation: (body) =>
    apiFetch('/conversations', { method: 'POST', body: JSON.stringify(body) }),

  getConversation: (id) => apiFetch(`/conversations/${encodeURIComponent(id)}`),

  deleteConversation: (id) =>
    apiFetch(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getMessages: (conversationId) =>
    apiFetch(`/conversations/${encodeURIComponent(conversationId)}/messages`),

  sendMessage: (conversationId, question) =>
    apiFetch(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  getPreferences: () => apiFetch('/preferences'),

  upsertPreferences: (body) =>
    apiFetch('/preferences', { method: 'POST', body: JSON.stringify(body) }),

  likeDish: (dishName) =>
    apiFetch('/preferences/like', { method: 'POST', body: JSON.stringify({ dish_name: dishName }) }),

  dislikeDish: (dishName) =>
    apiFetch('/preferences/dislike', { method: 'POST', body: JSON.stringify({ dish_name: dishName }) }),

  getFeedback: () => apiFetch('/feedback'),

  submitFeedback: (body) =>
    apiFetch('/feedback', { method: 'POST', body: JSON.stringify(body) }),

  updateFeedbackStatus: (id, status) =>
    apiFetch(`/feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin login
  adminLogin: (password) =>
    apiFetch('/auth/admin', { method: 'POST', body: JSON.stringify({ password }) }),
}
