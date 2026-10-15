import { useEffect, useState } from 'react'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { getCollectionStatus, type CollectionStatus } from '../services/metrics.ts'
import type { ServiceState } from '../types/service.ts'

const STATES: ServiceState[] = ['available', 'metrics_missing', 'unavailable', 'removed']

// Página provisória: serve para validar a estrutura e o tema.
// A tela inicial real (mapa, indicadores e tabela de serviços) entra nas próximas tasks.
export function HomePage() {
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function refreshStatus() {
      try {
        const status = await getCollectionStatus()
        if (disposed) return
        setCollectionStatus(status)
        setStatusError(null)
        timer = setTimeout(refreshStatus, status.interval_seconds * 1000)
      } catch (error) {
        if (disposed) return
        setStatusError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o estado da coleta.',
        )
        timer = setTimeout(refreshStatus, 30_000)
      } finally {
        if (!disposed) setLoadingStatus(false)
      }
    }

    void refreshStatus()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const formattedLastCollection = collectionStatus?.last_collection_at
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(collectionStatus.last_collection_at))
    : null

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-brand">Visão geral</h1>
        <p className="max-w-prose text-lg text-ink-muted">
          Estimativa do consumo de energia e das emissões de CO₂e de aplicações de software.
          Esta consulta é pública: não exige login.
        </p>
      </header>

      <section
        aria-labelledby="atualizacao-titulo"
        className="rounded-xl border border-line bg-surface p-5"
      >
        <h2 id="atualizacao-titulo" className="mb-3 text-base font-medium">
          Atualização das métricas
        </h2>
        {loadingStatus ? (
          <p role="status" className="text-ink-muted">
            Carregando informações da coleta…
          </p>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Intervalo entre ciclos</dt>
              <dd>
                {collectionStatus
                  ? `${collectionStatus.interval_seconds} segundos após o término do ciclo anterior`
                  : 'Indisponível'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Última coleta registrada</dt>
              <dd>{formattedLastCollection ?? 'Nenhuma coleta registrada ainda'}</dd>
            </div>
          </dl>
        )}
        {statusError && (
          <p role="alert" className="mt-3 text-sm text-state-down">
            Não foi possível consultar a atualização: {statusError}
          </p>
        )}
      </section>

      <section
        aria-labelledby="estados-titulo"
        className="rounded-xl border border-line bg-surface p-5"
      >
        <h2 id="estados-titulo" className="mb-4 text-base font-medium">
          Estados dos serviços
        </h2>
        <ul className="flex flex-wrap gap-3">
          {STATES.map((state) => (
            <li key={state}>
              <StatusBadge state={state} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
