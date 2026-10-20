import { PlaceholderCard } from '../components/PlaceholderCard.tsx'
import { SessionCard } from '../components/SessionCard.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { useLogout } from '../hooks/useLogout.ts'

export function AdminPage() {
  const { session } = useAuth()
  const handleLogout = useLogout()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Acesso restrito
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Área do Administrador</h1>
          <p className="max-w-prose text-ink-muted">
            Configuração do monitoramento, histórico temporal das coletas e sessão autenticada.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          Sair
        </button>
      </header>

      <SessionCard session={session} />

      <PlaceholderCard eyebrow="RF16 · Configuração do monitoramento" title="Parâmetros de coleta e exibição">
        Disponível quando o backend expuser a rota protegida de configuração.
      </PlaceholderCard>
      <PlaceholderCard eyebrow="RF10 · Histórico de coletas" title="Registros mais recentes">
        Disponível quando o backend expuser o histórico de coletas.
      </PlaceholderCard>
    </div>
  )
}
