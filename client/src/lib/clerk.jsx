import React, { createContext, useContext } from 'react'
import * as RealClerk from '@clerk/react'

// Detect offline status at startup
const isOfflineOnStartup = typeof navigator !== 'undefined' && !navigator.onLine

const PROFILE_CACHE_KEY = 'messloo_user_profile'

// Auth Context to unify online (Real Clerk) and offline (Mock Cache)
const MessLooAuthContext = createContext(null)

// Helper component that subscribes to real Clerk hooks and forwards to our context
function RealAuthContextConnector({ children }) {
  const auth = RealClerk.useAuth()
  const userObj = RealClerk.useUser()

  const contextValue = {
    auth,
    userObj,
    isOffline: false,
  }

  return (
    <MessLooAuthContext.Provider value={contextValue}>
      {children}
    </MessLooAuthContext.Provider>
  )
}

export function ClerkProvider({ children, ...props }) {
  if (isOfflineOnStartup) {
    const cachedProfileStr = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_CACHE_KEY) : null
    const hasSession = !!cachedProfileStr
    let parsedProfile = null
    try {
      if (cachedProfileStr) parsedProfile = JSON.parse(cachedProfileStr)
    } catch (e) {
      console.error('Failed to parse cached profile', e)
    }

    const mockAuth = {
      isLoaded: true,
      isSignedIn: hasSession,
      getToken: async () => 'offline-mock-token',
      userId: parsedProfile ? parsedProfile.clerk_id || 'offline-user' : null,
    }

    const mockUserObj = {
      isLoaded: true,
      isSignedIn: hasSession,
      user: parsedProfile ? {
        id: parsedProfile.clerk_id || 'offline-user',
        fullName: parsedProfile.name || 'Student',
        username: parsedProfile.username || 'student',
        publicMetadata: {
          college_id: parsedProfile.college_id,
          block_id: parsedProfile.block_id,
        }
      } : null
    }

    const contextValue = {
      auth: mockAuth,
      userObj: mockUserObj,
      isOffline: true,
    }

    return (
      <MessLooAuthContext.Provider value={contextValue}>
        {children}
      </MessLooAuthContext.Provider>
    )
  }

  return (
    <RealClerk.ClerkProvider {...props}>
      <RealAuthContextConnector>
        {children}
      </RealAuthContextConnector>
    </RealClerk.ClerkProvider>
  )
}

export function useAuth() {
  const ctx = useContext(MessLooAuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within a ClerkProvider')
  }
  return ctx.auth
}

export function useUser() {
  const ctx = useContext(MessLooAuthContext)
  if (!ctx) {
    throw new Error('useUser must be used within a ClerkProvider')
  }
  return ctx.userObj
}

export function UserButton({ appearance, ...props }) {
  const ctx = useContext(MessLooAuthContext)

  if (!ctx || ctx.isOffline) {
    const cachedProfileStr = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_CACHE_KEY) : null
    let name = 'Student'
    if (cachedProfileStr) {
      try {
        const parsed = JSON.parse(cachedProfileStr)
        name = parsed.name || 'Student'
      } catch {}
    }
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const avatarBoxClass = appearance?.elements?.userButtonAvatarBox || 'w-10 h-10'

    return (
      <div
        className={`${avatarBoxClass} rounded-full flex items-center justify-center font-bold text-sm select-none relative cursor-pointer`}
        style={{
          background: 'linear-gradient(135deg, #E23744, #C0392B)',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(226,55,68,0.2)'
        }}
        title={`${name} (Offline)`}
      >
        {initials}
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white"
          style={{ background: '#F59E0B' }}
          title="Offline"
        />
      </div>
    )
  }

  return <RealClerk.UserButton appearance={appearance} {...props} />
}

export function SignIn(props) {
  const ctx = useContext(MessLooAuthContext)

  if (!ctx || ctx.isOffline) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto my-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-xl">
        <div className="text-4xl mb-4">📶</div>
        <h2 className="text-lg font-extrabold mb-2 text-[#1C1C1E]">Connection Required</h2>
        <p className="text-sm text-[#8B7355] mb-6">
          You need an active internet connection to sign in or register. Please connect and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-2xl text-sm font-bold py-3.5 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #E23744, #C0392B)',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(226,55,68,0.3)',
          }}
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return <RealClerk.SignIn {...props} />
}
