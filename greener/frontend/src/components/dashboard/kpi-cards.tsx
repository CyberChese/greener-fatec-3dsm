import { CircleCheck, CircleDashed, Cloud, Gauge, TriangleAlert, Zap, type LucideIcon } from 'lucide-react'
import { formatIntensity, formatNumber } from '@/lib/format'
import type { Aggregates } from '@/lib/types'
import { GlassCard } from './glass-card'

interface KpiCardsProps {
  periodLabel: string
  /** Nulo quando o backend ainda não fornece energia/CO2e (aparece como "—", nunca como zero). */
  periodEnergyKwh: number | null
  periodCo2eKg: number | null
  current: Aggregates
}

function Kpi({
  icon: Icon,
  iconClass,
  label,
  value,
  unit,
  hint,
}: {
  icon: LucideIcon
  iconClass: string
  label: string
  value: string
  unit: string
  hint: string
}) {
  return (
    <GlassCard className="flex items-start gap-4 p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${iconClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-50">{value}</span>
          <span className="text-xs text-zinc-500">{unit}</span>
        </p>
        <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>
      </div>
    </GlassCard>
  )
}

export function KpiCards({ periodLabel, periodEnergyKwh, periodCo2eKg, current }: KpiCardsProps) {
  const intensity =
    periodEnergyKwh != null && periodCo2eKg != null && periodEnergyKwh > 0 ? (periodCo2eKg * 1000) / periodEnergyKwh : null
  const hasConsumption = periodEnergyKwh != null && periodCo2eKg != null
  const activeShare = current.total > 0 ? Math.round((current.active / current.total) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores consolidados">
      <Kpi
        icon={Zap}
        iconClass="bg-amber-400/10 text-amber-300 ring-amber-400/30"
        label="Consumo energético total"
        value={periodEnergyKwh == null ? '—' : formatNumber(periodEnergyKwh, 3)}
        unit="kWh"
        hint={hasConsumption ? `${periodLabel} · última coleta ${formatNumber(current.totalEnergyKwh, 3)} kWh` : 'Ainda não calculado pelo backend'}
      />
      <Kpi
        icon={Cloud}
        iconClass="bg-violet-400/10 text-violet-300 ring-violet-400/30"
        label="Emissão total de CO₂e"
        value={periodCo2eKg == null ? '—' : formatNumber(periodCo2eKg, 3)}
        unit="kgCO₂e"
        hint={hasConsumption ? `${periodLabel} · última coleta ${formatNumber(current.totalCo2eKg, 3)} kg` : 'Ainda não calculado pelo backend'}
      />
      <Kpi
        icon={Gauge}
        iconClass="bg-cyan-400/10 text-cyan-300 ring-cyan-400/30"
        label="Intensidade média"
        value={formatIntensity(intensity)}
        unit="gCO₂e/kWh"
        hint="Emissão ÷ energia no período"
      />

      <GlassCard className="flex items-center gap-4 p-4">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#a3e635 ${activeShare * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
          role="img"
          aria-label={`${activeShare}% dos serviços ativos`}
        >
          <span className="grid size-9 place-items-center rounded-full bg-zinc-950 font-mono text-[11px] font-semibold text-zinc-100">
            {activeShare}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">Serviços ativos vs indisponíveis</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-zinc-50">
            {current.active}
            <span className="text-base text-zinc-500"> / {current.total}</span>
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            <li className="inline-flex items-center gap-1 text-emerald-300">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {current.active} ativos
            </li>
            <li className="inline-flex items-center gap-1 text-rose-300">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {current.unavailable} indisponíveis
            </li>
            <li className="inline-flex items-center gap-1 text-amber-300">
              <CircleDashed className="size-3.5" aria-hidden="true" />
              {current.noMetrics} sem métricas
            </li>
          </ul>
        </div>
      </GlassCard>
    </div>
  )
}
