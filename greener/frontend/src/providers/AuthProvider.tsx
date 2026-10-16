import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from '../contexts/AuthContext.ts'
import type { AuthContextValue, Session } from '../contexts/AuthContext.ts'
import { readJwtClaims } from '../services/jwt.ts'
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from '../services/session.ts'

type AuthProviderProps = {
  children: ReactNode
}

// Maior atraso que o setTimeout aceita (cerca de 24,8 dias).
const MAX_TIMER_MS = 2_147_483_647

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const login = useCallback((token: string, fallbackEmail?: string) => {
    const claims = readJwtClaims(token)
    setAccessToken(token)
    setSession({
      email: claims.email ?? fallbackEmail ?? null,
      role: claims.role ?? null,
      expiresAt: claims.exp !== undefined ? new Date(claims.exp * 1000) : null,
    })
    setSessionExpired(false)
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setSession(null)
  }, [])

  const expireSession = useCallback(() => {
    if (getAccessToken() === null) return // sem sessão ativa, não há o que encerrar
    setAccessToken(null)
    setSession(null)
    setSessionExpired(true)
  }, [])

  // O interceptor do Axios avisa por aqui quando uma chamada protegida retorna 401.
  useEffect(() => {
    setUnauthorizedHandler(expireSession)
    return () => setUnauthorizedHandler(null)
  }, [expireSession])

  // Encerra a sessão sozinha quando o token vence.
  const expiresAt = session?.expiresAt ?? null
  useEffect(() => {
    if (!expiresAt) return
    const remaining = expiresAt.getTime() - Date.now()
    if (remaining > MAX_TIMER_MS) return
    const id = window.setTimeout(expireSession, Math.max(remaining, 0))
    return () => window.clearTimeout(id)
  }, [expiresAt, expireSession])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: session !== null, session, sessionExpired, login, logout }),
    [session, sessionExpired, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
