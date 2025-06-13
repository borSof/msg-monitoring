'use client'

import React, {
  createContext, useContext,
  useState, useEffect
} from 'react'
import { setAuthToken } from '../api'

const LS_TOKEN = 'authToken'
const LS_ROLE  = 'role'
const LS_USER  = 'username'
const LS_PERM  = 'permissions'

function decodeJwt(token: string) {
  try {
    const [, base64Url] = token.split('.')
    const json = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}

interface AuthCtx {
  token: string | null
  role:  string | null
  username: string | null
  permissions: string[]
  setToken:       (t: string|null) => void
  setRole:        (r: string|null) => void
  setUsername:    (u: string|null) => void
  setPermissions: (p: string[])    => void
  logout:         () => void
}
const AuthContext = createContext<AuthCtx>(null!)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }:{children:React.ReactNode}) {
  // ЛОГ: всеки път, когато този компонент се mount-ва
  console.log('[AuthProvider] COMPONENT MOUNT', new Date());

  const [token, setToken]             = useState<string|null>(null)
  const [role, setRole]               = useState<string|null>(null)
  const [username, setUsername]       = useState<string|null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  // 1. Зареждаме auth данните от localStorage при mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tk  = localStorage.getItem(LS_TOKEN)
    const rl  = localStorage.getItem(LS_ROLE)
    const usr = localStorage.getItem(LS_USER)
    const prm = JSON.parse(localStorage.getItem(LS_PERM) || '[]')

    console.log('[AuthProvider] Load from localStorage:', {
      token: tk, role: rl, username: usr, permissions: prm
    })

    setToken(tk)
    setRole(rl)
    setUsername(usr)
    setPermissions(prm)
  }, []);

  // 2. Синхронизираме state с localStorage и ЛОГВАМЕ промените
  useEffect(() => {
    token ? localStorage.setItem(LS_TOKEN, token)
          : localStorage.removeItem(LS_TOKEN)
    setAuthToken(token)
    console.log('[AuthProvider] token set:', token)
  }, [token])

  useEffect(() => {
    role ? localStorage.setItem(LS_ROLE, role)
         : localStorage.removeItem(LS_ROLE)
    console.log('[AuthProvider] role set:', role)
  }, [role])

  useEffect(() => {
    username ? localStorage.setItem(LS_USER, username)
             : localStorage.removeItem(LS_USER)
    console.log('[AuthProvider] username set:', username)
  }, [username])

  useEffect(() => {
    localStorage.setItem(LS_PERM, JSON.stringify(permissions))
    console.log('[AuthProvider] permissions set:', permissions)
  }, [permissions])

  // 3. Auto-logout ако JWT е изтекъл
  useEffect(() => {
    if (!token) {
      console.log('[AuthProvider] No token in state.');
      return
    }
    const dec = decodeJwt(token)
    console.log('[AuthProvider] Decoded token:', dec)

    if (!dec?.exp) {
      console.log('[AuthProvider] Token has no exp, skipping auto-logout');
      return
    }
    const msLeft = dec.exp * 1000 - Date.now()
    console.log('[AuthProvider] Token msLeft:', msLeft)

    if (msLeft <= 0) {
      console.log('[AuthProvider] Token expired, auto-logout!');
      logout()
      return
    }
    const t = setTimeout(() => {
      console.log('[AuthProvider] Token expired (timeout), auto-logout!')
      logout()
    }, msLeft)
    return () => clearTimeout(t)
  }, [token])

  function logout () {
    console.log('[AuthProvider] LOGOUT!', new Date());
    setToken(null); setRole(null); setUsername(null); setPermissions([])
    setAuthToken(null)
    // Само auth ключове! Не трий localStorage.clear()
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_ROLE)
    localStorage.removeItem(LS_USER)
    localStorage.removeItem(LS_PERM)
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      token, setToken,
      role, setRole,
      username, setUsername,
      permissions, setPermissions,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
