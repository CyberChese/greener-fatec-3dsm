import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:text-ink'
  }`

export function AppLayout() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3"
        >
          <span className="mr-4 text-lg font-semibold text-brand">GreenER</span>
          <NavLink to="/" end className={linkClass}>
            Visão geral
          </NavLink>
          <NavLink to="/comparar" className={linkClass}>
            Comparar
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NavLink to="/config" className={linkClass}>
                  Configuração
                </NavLink>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink to="/login" className={linkClass}>
                Entrar
              </NavLink>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
