import { Cloud, Flame, Zap } from 'lucide-react'
import { formatImpact } from '@/lib/format'
import type { RankingMetric, ServiceSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CardHeading, GlassCard } from './glass-card'
import { STATUS_META } from './status-meta'

interface ImpactRankingProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  metric: RankingMetric
  onMetricChange: (metric: RankingMetric) => void
  periodLabel: string
}

/** Selo de posição: número e texto sempre visíveis; a cor só reforça (o 1º lugar é o maior poluidor). */
export function RankBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <span
        data-rank="1"
        title="1º lugar: maior impacto"
        className="inline-flex items-center gap-1 rounded-full bg-state-down/10 px-2 py-0.5 text-xs font-semibold text-state-down ring-1 ring-state-down/40"
      >
        <Flame className="size-3.5" aria-hidden="true" />
        1º<span className="sr-only"> · Maior impacto</span>
      </span>
    )
  }
  return (
    <span
      data-rank={position}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        position <= 3 ? 'bg-amber-400/10 text-amber-300 ring-amber-400/40' : 'bg-white/5 text-zinc-300 ring-white/15',
      )}
    >
      {position}º
    </span>
  )
}

export function ImpactRanking({ services, periodTotals, metric, onMetricChange, periodLabel }: ImpactRankingProps) {
  // Serviço sem medição no período não entra no ranking (não vale zero); a quantidade omitida é informada abaixo.
  const measured = services.filter((s) => periodTotals.has(s.id))
  const omitted = services.length - measured.length
  const rows = measured
    .map((s) => {
      const totals = periodTotals.get(s.id)
      const energyKwh = totals?.energyKwh ?? 0
      const co2eKg = totals?.co2eKg ?? 0
      return { service: s, energyKwh, co2eKg, value: metric === 'energy' ? energyKwh : co2eKg }
    })
    .sort((a, b) => b.value - a.value || a.service.name.localeCompare(b.service.name, 'pt-BR'))

  const max = Math.max(1e-9, ...rows.map((r) => r.value))
  const metricName = metric === 'energy' ? 'consumo de energia (kWh)' : 'emissão de CO₂e'

  return (
    <GlassCard aria-labelledby="ranking-title" className="flex flex-col">
      <CardHeading
        eyebrow="Ranking de impacto"
        title={metric === 'energy' ? 'Maior consumo energético' : 'Maior emissão de CO₂e'}
        id="ranking-title"
        aside={
          <div className="flex rounded-lg border border-edge p-0.5 text-xs" role="group" aria-label="Ordenar ranking por">
            <button
              type="button"
              aria-pressed={metric === 'energy'}
              onClick={() => onMetricChange('energy')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${metric === 'energy' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              <Zap className="size-3.5" aria-hidden="true" /> Maior consumo (kWh)
            </button>
            <button
              type="button"
              aria-pressed={metric === 'co2e'}
              onClick={() => onMetricChange('co2e')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${metric === 'co2e' ? 'bg-violet-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              <Cloud className="size-3.5" aria-hidden="true" /> Maior emissão (CO₂e)
            </button>
          </div>
        }
      />
      <p className="-mt-2 mb-4 text-xs text-ink-subtle">Período considerado: {periodLabel}</p>

      {services.length === 0 ? (
        <p className="text-sm text-ink-subtle">Nenhum serviço corresponde aos filtros.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-subtle">Nenhum serviço tem medição de energia e CO₂e no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">
              Ranking de serviços por {metricName}, período {periodLabel}
            </caption>
            <thead>
              <tr className="border-b border-white/10 text-xs text-ink-subtle">
                <th scope="col" className="py-1.5 pr-2 font-medium">Posição</th>
                <th scope="col" className="py-1.5 pr-2 font-medium">Serviço</th>
                <th scope="col" aria-sort={metric === 'energy' ? 'descending' : undefined} className="py-1.5 pr-2 text-right font-medium">
                  <span className="sr-only">Consumo (</span>kWh<span className="sr-only">)</span>
                </th>
                <th scope="col" aria-sort={metric === 'co2e' ? 'descending' : undefined} className="py-1.5 text-right font-medium">
                  <span className="sr-only">Emissão (</span>kgCO₂e<span className="sr-only">)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ service, energyKwh, co2eKg, value }, index) => {
                const meta = STATUS_META[service.status]
                const Icon = meta.icon
                const share = Math.round((value / max) * 100)
                return (
                  <tr key={service.id} className="border-b border-white/5 align-top last:border-0">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <RankBadge position={index + 1} />
                    </td>
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-1.5 text-zinc-200">
                        <span className="truncate">{service.name}</span>
                        <Icon className="size-3.5 shrink-0" style={{ color: meta.hex }} aria-hidden="true" />
                        <span className="sr-only">{meta.label}</span>
                      </span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                        <span
                          className={cn(
                            'block h-full rounded-full transition-[width] duration-700',
                            metric === 'energy'
                              ? 'bg-gradient-to-r from-amber-500/70 to-amber-300'
                              : 'bg-gradient-to-r from-violet-500/70 to-violet-300',
                          )}
                          style={{ width: `${share}%` }}
                        />
                      </span>
                    </td>
                    <td className={cn('py-2 pr-2 text-right font-mono tabular-nums', metric === 'energy' ? 'text-amber-200' : 'text-zinc-300')}>
                      {formatImpact(energyKwh, 3)}
                    </td>
                    <td className={cn('py-2 text-right font-mono tabular-nums', metric === 'co2e' ? 'text-violet-200' : 'text-zinc-300')}>
                      {formatImpact(co2eKg, 4)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {omitted > 0 && rows.length > 0 ? (
        <p className="mt-4 text-xs text-ink-subtle">
          {omitted} serviço(s) sem medição no período não aparecem no ranking.
        </p>
      ) : null}
    </GlassCard>
  )
}
