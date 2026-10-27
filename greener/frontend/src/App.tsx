import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/AppLayout.tsx'
import { LoginModal } from './components/LoginModal.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuth } from './hooks/useAuth.ts'
import { useLoginRedirect } from './hooks/useLoginRedirect.ts'
import { AdminPage } from './pages/AdminPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

// Consulta (observatório e comparação) é pública; só a área do administrador exige sessão.
// A rota /login mostra só o modal de entrada sobre um fundo preto; o resto do site não aparece.
function App() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const redirectTo = useLoginRedirect()
  const isLoginRoute = location.pathname === '/login'

  if (isLoginRoute && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-black">
        <LoginModal />
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="config" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
