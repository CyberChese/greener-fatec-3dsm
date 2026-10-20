import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/AppLayout.tsx'
import { LoginModal } from './components/LoginModal.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuth } from './hooks/useAuth.ts'
import { useLoginRedirect } from './hooks/useLoginRedirect.ts'
import { AdminPage } from './pages/AdminPage.tsx'
import { ComparePage } from './pages/ComparePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

// Consulta (observatório e comparação) é pública; só a área do administrador exige sessão.
// O login não é uma página: é um modal que abre sobre o observatório quando a rota é /login.
function App() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const redirectTo = useLoginRedirect()
  const isLoginRoute = location.pathname === '/login'

  if (isLoginRoute && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <>
      <Routes location={isLoginRoute ? '/' : location}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="comparar" element={<ComparePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="config" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      {isLoginRoute && <LoginModal />}
    </>
  )
}

export default App
