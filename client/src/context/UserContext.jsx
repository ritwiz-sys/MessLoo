import { createContext, useContext } from 'react'
import { useCurrentUser } from '../hooks/useCurrentUser'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const value = useCurrentUser()
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return ctx
}
