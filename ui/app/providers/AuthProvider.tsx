'use client'

import React, {
  createContext, useContext,
  useState, useEffect
} from 'react'

/* ───────── константи ───────── */
const LS_TOKEN = 'authToken'
const LS_ROLE  = 'role'
const LS_USER  = 'username'
const LS_PERM  = 'permissions'

/* ───────── helpers ─────────── */
function decodeJwt (token: string) {
  try {
    const [, base64Url] = token.split('.')
    const json = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}

/* ───────── контекст ────────── */
interface AuthCtx {
  token: string | null
  role:  string | null
  username: string | null
  permissions: string[]
  setToken:       (t: string|null) => void
  setRole:        (r: string|null) => void
  setUsername:    (u: string|null) => void
  setPermissions: (p: string[])    => void
}
const AuthContext = createContext<AuthCtx>(null!)

export const useAuth = () => useContext(AuthContext)

/* ───────── provider ────────── */
export function AuthProvider ({ children }:{children:React.ReactNode}) {
  const [token, setToken]             = useState<string|null>(null)
  const [role, setRole]               = useState<string|null>(null)
  const [username, setUsername]       = useState<string|null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  /* ---------- 1. четем localStorage само веднъж ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return        // SSR guard
    setToken(       localStorage.getItem(LS_TOKEN))
    setRole(        localStorage.getItem(LS_ROLE))
    setUsername(    localStorage.getItem(LS_USER))
    setPermissions(JSON.parse(localStorage.getItem(LS_PERM) || '[]'))
  }, [])

  /* ---------- 2. пазим state-а обратно в localStorage ---------- */
  useEffect(() => {
    token ? localStorage.setItem(LS_TOKEN, token)
          : localStorage.removeItem(LS_TOKEN)
  }, [token])

  useEffect(() => {
    role  ? localStorage.setItem(LS_ROLE, role)
          : localStorage.removeItem(LS_ROLE)
  }, [role])

  useEffect(() => {
    username ? localStorage.setItem(LS_USER, username)
             : localStorage.removeItem(LS_USER)
  }, [username])

  useEffect(() => {
    localStorage.setItem(LS_PERM, JSON.stringify(permissions))
  }, [permissions])

  /* ---------- 3. auto-logout при изтекъл токен ---------- */
  useEffect(() => {
    if (!token) return
    const dec = decodeJwt(token)
    if (!dec?.exp) return
    const msLeft = dec.exp * 1000 - Date.now()
    if (msLeft <= 0) return logout()

    const t = setTimeout(logout, msLeft)
    return () => clearTimeout(t)
  }, [token])

  /* ---------- helpers ---------- */
  function logout () {
    setToken(null); setRole(null); setUsername(null); setPermissions([])
    localStorage.clear()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

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
