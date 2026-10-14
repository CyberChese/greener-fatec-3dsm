import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

// Protege apenas a navegação na interface. A proteção de verdade
// é feita no backend, que valida o JWT em cada rota protegida (RP07).
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
