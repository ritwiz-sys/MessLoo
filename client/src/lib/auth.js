const SESSION_KEY = 'messloo_session'
const USER_ID_KEY = 'messloo_user_id'

/** Get or create a persistent random user ID */
export function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

/** { role: 'student'|'admin', block: 'MH'|'LH', adminToken?: string } */
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn() {
  return getSession() !== null
}

export function isAdmin() {
  return getSession()?.role === 'admin'
}
