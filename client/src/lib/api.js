const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * Thin fetch wrapper that attaches the Clerk JWT and base URL.
 * @param {string} path - e.g. '/menus?date=2026-06-24&block_category=MH'
 * @param {string|null} token - Clerk JWT from getToken()
 * @param {object} [options]
 */
export async function apiFetch(path, token, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const api = {
  getBlocks: () => apiFetch('/blocks', null),

  syncUser: (token, body) =>
    apiFetch('/users/sync', token, { method: 'POST', body: JSON.stringify(body) }),

  getMe: (token) => apiFetch('/users/me', token),

  updateMe: (token, body) =>
    apiFetch('/users/me', token, { method: 'PATCH', body: JSON.stringify(body) }),

  getMenus: (token, { date, block_category }) =>
    apiFetch(`/menus?date=${encodeURIComponent(date)}&block_category=${encodeURIComponent(block_category)}`, token),

  addMenu: (token, body) =>
    apiFetch('/menus', token, { method: 'POST', body: JSON.stringify(body) }),

  markAttendance: (token, body) =>
    apiFetch('/attendance', token, { method: 'POST', body: JSON.stringify(body) }),

  getAttendance: (token, { menu_id }) =>
    apiFetch(`/attendance?menu_id=${encodeURIComponent(menu_id)}`, token),

  getAttendanceSummary: (token, menuId) =>
    apiFetch(`/attendance/summary?menu_id=${encodeURIComponent(menuId)}`, token),

  addBlock: (token, body) =>
    apiFetch('/blocks', token, { method: 'POST', body: JSON.stringify(body) }),

  updateBlock: (token, id, body) =>
    apiFetch(`/blocks/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteBlock: (token, id) =>
    apiFetch(`/blocks/${encodeURIComponent(id)}`, token, { method: 'DELETE' }),

  askChat: (token, question) =>
    apiFetch('/chat', token, { method: 'POST', body: JSON.stringify({ question }) }),
}
