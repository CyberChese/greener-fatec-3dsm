import { LoaderCircle, RefreshCw, ServerCrash } from 'lucide-react'
import { CardHeading, GlassCard } from '@/components/dashboard/glass-card'
import { GeographicMapComponent } from '@/components/map/geographic-map-component'
import { useMetricsContext } from '@/hooks/useMetricsContext'
import { cn } from '@/lib/utils'

// Consulta pública: o mapa não exige login.
export function MapPage() {
  const { snapshots, tick, aggregatorError, refreshing, retry } = useMetricsContext()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-lime-400 uppercase">Geolocalização</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Mapa dos serviços</h1>
        <p className="mt-1 text-sm text-zinc-400 text-pretty">
          Cada marcador fica nas coordenadas do serviço. Clique (ou use Tab e Enter) para ver nome, nuvem, cidade/país e a
          pegada de carbono.
        </p>
      </div>

      {tick > 0 && snapshots.length > 0 && aggregatorError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200"
        >
          <ServerCrash className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Falha temporária na atualização — mantendo marcadores anteriores e tentando reconectar automaticamente.
            </p>
            <p className="text-orange-200/80">{aggregatorError}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-edge bg-zinc-900/70 px-3 text-sm text-zinc-100 outline-none hover:bg-zinc-800 focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/40 disabled:opacity-60"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : null}

      {tick === 0 ? (
        <p role="status" className="flex items-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Aguardando a primeira coleta dos serviços…
        </p>
      ) : snapshots.length === 0 ? (
        <GlassCard role="alert" aria-labelledby="map-empty">
          <CardHeading title="Nenhum serviço para exibir no mapa" id="map-empty" />
          <p className="text-sm text-zinc-400">{aggregatorError ?? 'Nenhum serviço foi descoberto até o momento.'}</p>
        </GlassCard>
      ) : (
        <GeographicMapComponent services={snapshots} />
      )}
    </div>
  )
}
