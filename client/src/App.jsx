import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession, isAdmin } from './lib/auth'
import { UserProvider } from './context/UserContext'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'
import InvitePage from './pages/InvitePage'

function RequireAuth({ children }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  if (!isAdmin()) return <Navigate to="/login" replace />
  return children
}

function Home() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <UserProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite" element={<InvitePage />} />

      {/* Student routes */}
      <Route path="/dashboard" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
      <Route path="/chat"      element={<RequireAuth><ChatPage /></RequireAuth>} />
      <Route path="/profile"   element={<RequireAuth><ProfilePage /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

      <Route path="*" element={<Home />} />
    </Routes>
    </UserProvider>
  )
}

export default App
