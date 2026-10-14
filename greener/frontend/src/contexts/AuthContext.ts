import { createContext } from 'react'

export type AuthContextValue = {
  /** Há uma sessão administrativa ativa. */
  isAuthenticated: boolean
  /** A sessão caiu por um 401 em chamada protegida (a tela de login usa isso para avisar). */
  sessionExpired: boolean
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
