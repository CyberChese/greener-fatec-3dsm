import { MapPinOff } from 'lucide-react'
import { formatGb, formatIntensity, formatKg, formatKwh, formatPercent } from '@/lib/format'
import type { ServiceSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CardHeading, GlassCard } from './glass-card'
import { StatusBadge } from './status-badge'

export interface ServicesTableProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  periodLabel: string
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: (ids: string[]) => void
  highlightId: string | null
  /** Quando verdadeiro, o cabeçalho do cartão é omitido (usado dentro de ServicesSection). */
  embedded?: boolean
}

export function ServicesTable({
  services,
  periodTotals,
  periodLabel,
  selectedIds,
  onToggle,
  onToggleAll,
  highlightId,
  embedded = false,
}: ServicesTableProps) {
  const visibleIds = services.map((s) => s.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  return (
    <GlassCard
      aria-labelledby={embedded ? undefined : 'table-title'}
      aria-label={embedded ? 'Detalhes dos serviços monitorados' : undefined}
      className="p-0"
    >
      {embedded ? null : (
        <div className="px-5 pt-5">
        <CardHeading
          eyebrow="Dashboard operacional"
          title="Detalhes dos serviços monitorados"
          id="table-title"
          aside={
            <span className="text-xs text-ink-subtle">
              {selectedIds.length} selecionado(s) para comparação · totais: {periodLabel}
            </span>
          }
        />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <caption className="sr-only">Estado, localização, métricas e impacto ambiental de cada serviço</caption>
          <thead className="border-y border-white/[0.06] bg-zinc-950/40 text-xs text-ink-subtle">
            <tr>
              <th scope="col" className="py-3 pr-2 pl-5">
                <input
                  type="checkbox"
                  className="size-4 accent-lime-400"
                  checked={allSelected}
                  onChange={() => onToggleAll(allSelected ? [] : visibleIds)}
                  aria-label="Selecionar todos os serviços visíveis para comparação"
                />
              </th>
              <th scope="col" className="px-3 py-3 font-medium">Serviço</th>
              <th scope="col" className="px-3 py-3 font-medium">Localização</th>
              <th scope="col" className="px-3 py-3 font-medium">Estado</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">CPU</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Memória</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Disco</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Rede</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">gCO₂e/kWh</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">kWh</th>
              <th scope="col" className="py-3 pr-5 pl-3 text-right font-medium">kgCO₂e</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-10 text-center text-ink-subtle">
                  Nenhum serviço corresponde aos filtros aplicados.
                </td>
              </tr>
            ) : (
              services.map((s) => {
                const totals = periodTotals.get(s.id)
                const checked = selectedIds.includes(s.id)
                const hasCoords = s.location.latitude != null && s.location.longitude != null
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      'border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]',
                      checked && 'bg-lime-400/[0.04]',
                      highlightId === s.id && 'bg-lime-400/[0.08]',
                    )}
                  >
                    <td className="py-3 pr-2 pl-5">
                      <input
                        type="checkbox"
                        className="size-4 accent-lime-400"
                        checked={checked}
                        onChange={() => onToggle(s.id)}
                        aria-label={`Comparar ${s.name}`}
                      />
                    </td>
                    <th scope="row" className="px-3 py-3 font-medium text-zinc-100">
                      {s.name}
                      <span className="block font-mono text-xs font-normal text-ink-subtle">{s.id}</span>
                    </th>
                    <td className="px-3 py-3 text-zinc-300">
                      <span className="block">{s.location.country}</span>
                      <span className="block text-xs text-ink-subtle">
                        {s.location.region}
                        {s.location.city ? ` · ${s.location.city}` : ' · cidade não informada'} · {s.location.region_code}
                      </span>
                      {!hasCoords ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-subtle">
                          <MapPinOff className="size-3" aria-hidden="true" /> sem coordenadas
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-300">{formatPercent(s.metrics?.cpu_percent ?? null)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-300">{formatGb(s.metrics?.memory_gb ?? null)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-300">{formatGb(s.metrics?.disk_gb ?? null)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-300">{formatGb(s.metrics?.network_gb ?? null)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-cyan-300">{formatIntensity(s.intensity)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-amber-300">{formatKwh(totals?.energyKwh ?? null)}</td>
                    <td className="py-3 pr-5 pl-3 text-right font-mono tabular-nums text-violet-300">{formatKg(totals?.co2eKg ?? null)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-ink-subtle">
        Métricas exibidas são da última coleta; ausência de métricas (—) não equivale a zero.
      </p>
    </GlassCard>
  )
}
