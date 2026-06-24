import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { UserProvider, useUserContext } from './context/UserContext'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard from './pages/AdminDashboard'

const ADMIN_ROLES = ['super_admin', 'company_admin']

function FullScreenLoader() {
  return (
    <div className="min-h-screen w-full bg-[#0b0b10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-xl animate-pulse">
          🍽️
        </div>
        <p className="text-sm text-gray-500">Loading MessLoo…</p>
      </div>
    </div>
  )
}

/** Sends a signed-in user to the dashboard that matches their role. Students
 * who haven't picked a block yet are sent to onboarding first. */
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

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ADMIN_ROLES.includes(role) ? '/admin' : '/dashboard'} replace />
  }

  return children
}

/** Same as ProtectedRoute, but also makes sure a student has completed
 * onboarding (picked their block) before letting them through. */
function RequireBlock({ children }) {
  const { blockCategory, loading } = useUserContext()

  if (loading) return <FullScreenLoader />
  if (!blockCategory) return <Navigate to="/onboarding" replace />

  return children
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
          <ProtectedRoute allowedRoles={['student']}>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <RequireBlock>
              <StudentDashboard />
            </RequireBlock>
          </ProtectedRoute>
        }
      />
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
