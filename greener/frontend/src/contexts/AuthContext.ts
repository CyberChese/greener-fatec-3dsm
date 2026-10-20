import { createContext } from 'react'

/** Dados da sessão administrativa, lidos do token apenas para exibição. */
export type Session = {
  email: string | null
  role: string | null
  expiresAt: Date | null
}

export type AuthContextValue = {
  /** Há uma sessão administrativa ativa. */
  isAuthenticated: boolean
  session: Session | null
  /** A sessão caiu (401 em chamada protegida ou token vencido); a tela de login avisa. */
  sessionExpired: boolean
  login: (token: string, fallbackEmail?: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
