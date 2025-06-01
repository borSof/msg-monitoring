'use client'
import { createContext, useContext, useState, useEffect } from "react"

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  // На стартиране: зареждай локалните auth данни
  useEffect(() => {
    const tok = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const username = localStorage.getItem("username")
    const perms = localStorage.getItem("permissions")
    setToken(tok)
    setRole(role)
    setUsername(username)
    setPermissions(perms ? JSON.parse(perms) : [])
  }, [])

  // Проверявай валидността на токена при всяка промяна!
  useEffect(() => {
    if (token) {
      const decoded = decodeJwt(token)
      if (!decoded || !decoded.exp || Date.now() >= decoded.exp * 1000) {
        // Token is invalid or expired
        setToken(null)
        setRole(null)
        setUsername(null)
        setPermissions([])
        localStorage.clear()
        // Може да използваш router, но за да е универсално:
        window.location.href = "/login"
      }
    }
  }, [token])

  return (
    <AuthContext.Provider value={{
      token, setToken,
      role, setRole,
      username, setUsername,
      permissions, setPermissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
