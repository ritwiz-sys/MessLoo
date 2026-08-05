import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { UserProvider, useUserContext } from './context/UserContext'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import StudentDashboard from './pages/StudentDashboard'
import MenuPage from './pages/MenuPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'

const ADMIN_ROLES = ['super_admin', 'company_admin']
const STUDENT_ROLES = ['student']

function FullScreenLoader() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFEEE8 100%)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-14 w-14 rounded-3xl flex items-center justify-center text-2xl"
          style={{
            background: '#E23744',
            boxShadow: '0 8px 24px rgba(226,55,68,0.25)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          🍱
        </div>
        <p className="text-sm font-semibold" style={{ color: '#6B6B6B' }}>Loading MessLoo…</p>
      </div>
    </div>
  )
}

/** Sends a signed-in user to the dashboard that matches their role. */
function RoleHome() {
  const { role, blockCategory, loading } = useUserContext()
  if (loading) return <FullScreenLoader />
  if (ADMIN_ROLES.includes(role)) return <Navigate to="/admin" replace />
  if (!blockCategory) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

/** Guards a route: requires sign-in, and optionally a specific role. */
function ProtectedRoute({ allowedRoles, children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { role, loading } = useUserContext()
  const location = useLocation()

  if (!isLoaded || loading) return <FullScreenLoader />
  if (!isSignedIn) return <Navigate to="/login" replace state={{ from: location }} />
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ADMIN_ROLES.includes(role) ? '/admin' : '/dashboard'} replace />
  }
  return children
}

/** Ensures student completed onboarding before accessing main app. */
function RequireBlock({ children }) {
  const { blockCategory, loading } = useUserContext()
  if (loading) return <FullScreenLoader />
  if (!blockCategory) return <Navigate to="/onboarding" replace />
  return children
}

/** Shared wrapper for all student tab pages. */
function StudentPage({ children }) {
  return (
    <ProtectedRoute allowedRoles={STUDENT_ROLES}>
      <RequireBlock>{children}</RequireBlock>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <FullScreenLoader />

  return (
    <Routes>
      <Route
        path="/login/*"
        element={isSignedIn ? <RoleHome /> : <LoginPage />}
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowedRoles={STUDENT_ROLES}>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* ── Student tab pages ── */}
      <Route path="/dashboard" element={<StudentPage><StudentDashboard /></StudentPage>} />
      <Route path="/menu"      element={<StudentPage><MenuPage /></StudentPage>} />
      <Route path="/chat"      element={<StudentPage><ChatPage /></StudentPage>} />
      <Route path="/profile"   element={<StudentPage><ProfilePage /></StudentPage>} />

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={isSignedIn ? <RoleHome /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  )
}

export default App
