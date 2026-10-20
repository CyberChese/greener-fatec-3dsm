import { NavLink, Outlet } from 'react-router'
import { Logo } from './Logo.tsx'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-4 text-sm font-medium transition-colors ${
    isActive
      ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand'
      : 'text-ink-muted hover:text-ink'
  }`

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-canvas">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-6"
        >
          <Logo />
          <NavLink to="/" end className={tabClass}>
            Observatório
          </NavLink>
          <NavLink to="/config" className={tabClass}>
            Área do Administrador
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
