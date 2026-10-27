import { LogOut } from 'lucide-react'
import { HistoryTable } from '@/components/admin/history-table'
import { MonitoringSettings } from '@/components/admin/monitoring-settings'
import { ServiceHistoryPanel } from '@/components/admin/service-history-panel'
import { IS_SIMULATED } from '@/lib/dataSource'
import { useMetricsContext } from '@/hooks/useMetricsContext'
import { SessionCard } from '../components/SessionCard.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { useLogout } from '../hooks/useLogout.ts'

export function AdminPage() {
  const { session } = useAuth()
  const handleLogout = useLogout()
  const metrics = useMetricsContext()

  return (
    <div id="view-admin" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-lime-400 uppercase">Acesso restrito</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">Área do Administrador</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configuração do monitoramento, histórico temporal das coletas e sessão autenticada.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-edge px-4 text-sm font-medium text-zinc-300 hover:border-lime-400/40 hover:text-zinc-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </button>
      </div>

      <SessionCard session={session} />
      <MonitoringSettings />
      {IS_SIMULATED ? (
        <HistoryTable history={metrics.history} onClear={metrics.clearHistory} intervalSeconds={metrics.intervalMs / 1000} />
      ) : (
        <ServiceHistoryPanel services={metrics.snapshots} />
      )}
    </div>
  )
}
