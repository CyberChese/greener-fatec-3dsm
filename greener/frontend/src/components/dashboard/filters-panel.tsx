import { Crosshair, Search, X } from 'lucide-react'
import type { DashboardFilters, ServiceStatus } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'

interface FiltersPanelProps {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  onClear: () => void
  resultCount: number
  totalCount: number
}

const inputClass =
  'h-10 w-full rounded-lg border border-edge bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-ink-subtle outline-none transition-colors focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400'

function parseCoordinate(value: string, limit: number): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(-limit, Math.min(limit, parsed))
}

export function FiltersPanel({ filters, onChange, onClear, resultCount, totalCount }: FiltersPanelProps) {
  const { point } = filters
  const hasPoint = point.latitude != null && point.longitude != null

  return (
    <GlassCard aria-labelledby="filters-title" className="flex flex-col gap-5">
      <CardHeading
        eyebrow="Consulta"
        title="Filtros e ponto de consulta"
        id="filters-title"
        aside={
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
            {resultCount}/{totalCount}
          </span>
        }
      />

      <div>
        <label htmlFor="filter-search" className={labelClass}>
          Buscar serviço
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input
            id="filter-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Serviço, cidade, país ou região…"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="filter-status" className={labelClass}>
          Estado de monitoramento
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as ServiceStatus | 'all' })}
          className={inputClass}
        >
          <option value="all">Todos os estados</option>
          <option value="active">✓ Ativos</option>
          <option value="unavailable">▲ Indisponíveis</option>
          <option value="no_metrics">◌ Sem métricas</option>
        </select>
      </div>

      <fieldset className="rounded-xl border border-white/[0.08] bg-zinc-950/30 p-3">
        <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-pink-300 uppercase">
          <Crosshair className="size-3.5" aria-hidden="true" />
          Ponto de consulta
        </legend>
        <p className="mb-3 text-xs text-ink-subtle">Clique em um país ou serviço no mapa para preencher.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-lat" className={labelClass}>
              Latitude
            </label>
            <input
              id="filter-lat"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={-90}
              max={90}
              placeholder="-23.55"
              value={point.latitude ?? ''}
              onChange={(e) =>
                onChange({ ...filters, point: { ...point, latitude: parseCoordinate(e.target.value, 90) } })
              }
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="filter-lon" className={labelClass}>
              Longitude
            </label>
            <input
              id="filter-lon"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={-180}
              max={180}
              placeholder="-46.63"
              value={point.longitude ?? ''}
              onChange={(e) =>
                onChange({ ...filters, point: { ...point, longitude: parseCoordinate(e.target.value, 180) } })
              }
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="filter-radius" className="text-xs font-medium text-zinc-400">
              Raio de busca
            </label>
            <span className="font-mono text-xs text-zinc-200">{point.radiusKm.toLocaleString('pt-BR')} km</span>
          </div>
          <input
            id="filter-radius"
            type="range"
            min={500}
            max={20000}
            step={500}
            value={point.radiusKm}
            onChange={(e) => onChange({ ...filters, point: { ...point, radiusKm: Number(e.target.value) } })}
            className="w-full accent-lime-400"
          />
        </div>
        {hasPoint ? (
          <p className="mt-2 text-xs text-zinc-400">
            Filtrando serviços em até {point.radiusKm.toLocaleString('pt-BR')} km do ponto. Serviços sem coordenadas
            ficam ocultos enquanto o ponto estiver ativo.
          </p>
        ) : null}
      </fieldset>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-edge text-sm font-medium text-zinc-300 transition-colors hover:border-lime-400/40 hover:text-zinc-50"
      >
        <X className="size-4" aria-hidden="true" />
        Limpar filtros
      </button>
    </GlassCard>
  )
}
