import { Cloud, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { RankingMetric, ServiceSnapshot } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'
import { STATUS_META } from './status-meta'

interface ImpactRankingProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  metric: RankingMetric
  onMetricChange: (metric: RankingMetric) => void
  periodLabel: string
}

export function ImpactRanking({ services, periodTotals, metric, onMetricChange, periodLabel }: ImpactRankingProps) {
  const rows = services
    .map((s) => {
      const totals = periodTotals.get(s.id)
      return { service: s, value: metric === 'energy' ? (totals?.energyKwh ?? 0) : (totals?.co2eKg ?? 0) }
    })
    .sort((a, b) => b.value - a.value)

  const max = Math.max(1e-9, ...rows.map((r) => r.value))
  const unit = metric === 'energy' ? 'kWh' : 'kgCO₂e'

  return (
    <GlassCard aria-labelledby="ranking-title" className="flex flex-col">
      <CardHeading
        eyebrow="Ranking de impacto"
        title={metric === 'energy' ? 'Maior consumo energético' : 'Maior emissão de CO₂e'}
        id="ranking-title"
        aside={
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label="Ordenar ranking por">
            <button
              type="button"
              aria-pressed={metric === 'energy'}
              onClick={() => onMetricChange('energy')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${metric === 'energy' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              <Zap className="size-3.5" aria-hidden="true" /> kWh
            </button>
            <button
              type="button"
              aria-pressed={metric === 'co2e'}
              onClick={() => onMetricChange('co2e')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${metric === 'co2e' ? 'bg-violet-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              <Cloud className="size-3.5" aria-hidden="true" /> CO₂e
            </button>
          </div>
        }
      />
      <p className="-mt-2 mb-4 text-xs text-zinc-500">Período considerado: {periodLabel}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum serviço corresponde aos filtros.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map(({ service, value }, index) => {
            const meta = STATUS_META[service.status]
            const Icon = meta.icon
            return (
              <li key={service.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 font-mono text-xs text-zinc-500">{index + 1}.</span>
                    <span className="truncate text-zinc-200">{service.name}</span>
                    <Icon className="size-3.5 shrink-0" style={{ color: meta.hex }} aria-label={meta.label} />
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-300">
                    {formatNumber(value, metric === 'energy' ? 3 : 4)} {unit}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-white/5"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((value / max) * 100)}
                  aria-label={`${service.name}: ${Math.round((value / max) * 100)}% do maior valor`}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${
                      metric === 'energy'
                        ? 'bg-gradient-to-r from-amber-500/70 to-amber-300'
                        : 'bg-gradient-to-r from-violet-500/70 to-violet-300'
                    }`}
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </GlassCard>
  )
}
