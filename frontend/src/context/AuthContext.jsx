import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = useCallback(async (username, password) => {
    const { data } = await axios.post('/api/auth/login', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    // Decode token payload to get user info
    const payload = JSON.parse(atob(data.access.split('.')[1]))
    const userData = { username: payload.username, role: payload.role, location: payload.location, id: payload.user_id }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
