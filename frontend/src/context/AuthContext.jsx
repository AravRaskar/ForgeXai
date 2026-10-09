import { createContext, useContext, useMemo, useState } from 'react'
import { login as apiLogin } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(localStorage.getItem('access_token') && user),
      async login(email, password) {
        const data = await apiLogin(email, password)
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        return data.user
      },
      logout() {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
