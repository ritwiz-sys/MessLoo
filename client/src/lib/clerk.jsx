/**
 * Clerk shim — Clerk has been removed.
 * All exports here are no-ops so existing components compile without changes.
 * Auth is now handled by lib/auth.js (localStorage session).
 */
import { createContext, useContext } from 'react'

const Ctx = createContext(null)

export function ClerkProvider({ children }) {
  return <Ctx.Provider value={{}}>{children}</Ctx.Provider>
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => null,
    userId: null,
  }
}

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: null }
}

export function UserButton() {
  return null
}

export function SignIn() {
  return null
}
