import { RefreshCw } from 'lucide-react'
import { useCollectionStatus, type CollectionStatusState } from '@/hooks/use-collection-status'
import { CardHeading, GlassCard } from './glass-card'

const formatLastCollection = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))

/** Parte visual do painel (sem rede), para poder ser testada. */
export function CollectionStatusView({ status, error, loading }: CollectionStatusState) {
  return (
    <GlassCard aria-labelledby="collection-title">
      <CardHeading eyebrow="Coleta de métricas" title="Atualização das métricas" id="collection-title" />
      {loading ? (
        <p role="status" className="text-sm text-zinc-400">
          Carregando informações da coleta…
        </p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1.5 text-zinc-500">
              <RefreshCw className="size-3.5" aria-hidden="true" /> Intervalo entre ciclos
            </dt>
            <dd className="text-zinc-100">
              {status ? `${status.interval_seconds} segundos após o término do ciclo anterior` : 'Indisponível'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Última coleta registrada</dt>
            <dd className="text-zinc-100">
              {status?.last_collection_at
                ? formatLastCollection(status.last_collection_at)
                : 'Nenhuma coleta registrada ainda'}
            </dd>
          </div>
        </dl>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          Não foi possível consultar a atualização: {error}
        </p>
      ) : null}
    </GlassCard>
  )
}

/** Painel do estado da coleta do backend; só faz sentido no modo de dados reais. */
export function CollectionStatusPanel() {
  return <CollectionStatusView {...useCollectionStatus()} />
}
