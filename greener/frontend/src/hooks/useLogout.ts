import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from './useAuth.ts'

/**
 * Sai da área do administrador de forma intencional: primeiro volta ao Observatório
 * e só então encerra a sessão.
 *
 * A ordem importa. Se a sessão fosse encerrada antes de a navegação terminar, a rota
 * protegida (ainda na tela) entenderia que a sessão caiu e mandaria a pessoa para o login.
 */
export function useLogout(): () => void {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pending = useRef(false)

  // Caso comum: a tela protegida sai de cena ao navegar, e a sessão é encerrada nesse momento.
  useEffect(
    () => () => {
      if (pending.current) {
        pending.current = false
        logout()
      }
    },
    [logout],
  )

  // Caso de quem usa o hook numa tela que continua montada depois de navegar.
  useEffect(() => {
    if (pending.current && pathname === '/') {
      pending.current = false
      logout()
    }
  }, [pathname, logout])

  return useCallback(() => {
    pending.current = true
    navigate('/', { replace: true })
  }, [navigate])
}
