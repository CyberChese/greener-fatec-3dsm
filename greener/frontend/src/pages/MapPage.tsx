import { LoaderCircle } from 'lucide-react'
import { CardHeading, GlassCard } from '@/components/dashboard/glass-card'
import { GeographicMapComponent } from '@/components/map/geographic-map-component'
import { useMetricsContext } from '@/hooks/useMetricsContext'

// Consulta pública: o mapa não exige login.
export function MapPage() {
  const { snapshots, tick, aggregatorError } = useMetricsContext()

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
