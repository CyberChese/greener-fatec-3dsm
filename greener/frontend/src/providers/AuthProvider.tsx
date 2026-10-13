import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from '../contexts/AuthContext.ts'
import type { AuthContextValue } from '../contexts/AuthContext.ts'
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from '../services/session.ts'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const login = useCallback((token: string) => {
    setAccessToken(token)
    setIsAuthenticated(true)
    setSessionExpired(false)
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setIsAuthenticated(false)
  }, [])

  // O interceptor do Axios avisa por aqui quando uma chamada protegida retorna 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getAccessToken() === null) return // sem sessão ativa, não há o que encerrar
      setAccessToken(null)
      setIsAuthenticated(false)
      setSessionExpired(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, sessionExpired, login, logout }),
    [isAuthenticated, sessionExpired, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
