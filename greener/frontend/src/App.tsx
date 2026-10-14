import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { ComparePage } from './pages/ComparePage.tsx'
import { ConfigPage } from './pages/ConfigPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

// Consulta (visão geral e comparação) é pública; só a configuração exige sessão.
function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="comparar" element={<ComparePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="config" element={<ConfigPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
