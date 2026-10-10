import { Navigate, useLocation } from 'react-router'
import { PagePlaceholder } from '../components/PagePlaceholder.tsx'
import { useAuth } from '../hooks/useAuth.ts'

// Destino depois do login: a tela protegida que a pessoa tentou abrir, ou /config.
function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    return state.from
  }
  return '/config'
}

// Página provisória. O formulário real de login entra na TASK-012.
export function LoginPage() {
  const { isAuthenticated, sessionExpired, login } = useAuth()
  const location = useLocation()

  if (isAuthenticated) {
    return <Navigate to={redirectTarget(location.state)} replace />
  }

  return (
    <PagePlaceholder title="Entrar">
      {sessionExpired && (
        <p role="alert" className="mb-4 rounded-md border border-state-warn/40 bg-state-warn/10 px-3 py-2 text-state-warn">
          Sua sessão expirou. Entre novamente.
        </p>
      )}
      <p>O formulário de login administrativo entra na TASK-012.</p>
      {import.meta.env.DEV && (
        // Apenas para testar as rotas protegidas sem o backend. Removido na TASK-012.
        <button
          type="button"
          onClick={() => login('token-de-teste')}
          className="mt-4 rounded-md bg-cta px-4 py-2 font-medium text-on-cta"
        >
          Simular login (apenas desenvolvimento)
        </button>
      )}
    </PagePlaceholder>
  )
}
