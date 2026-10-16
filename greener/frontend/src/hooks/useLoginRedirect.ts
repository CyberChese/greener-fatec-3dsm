import { useLocation } from 'react-router'

/**
 * Para onde ir depois do login: a tela protegida que a pessoa tentou abrir
 * (guardada pelo ProtectedRoute em `state.from`), ou a área do administrador.
 */
export function useLoginRedirect(): string {
  const { state } = useLocation()
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }
  return '/config'
}
