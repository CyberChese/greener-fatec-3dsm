import { GitCompareArrows, X } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { ServiceSnapshot } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'
import { StatusBadge } from './status-badge'

interface ComparisonPanelProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  periodLabel: string
  onRemove: (id: string) => void
  onClear: () => void
}

interface Row {
  label: string
  unit: string
  digits: number
  barClass: string
  get: (s: ServiceSnapshot) => number | null
}

export function ComparisonPanel({ services, periodTotals, periodLabel, onRemove, onClear }: ComparisonPanelProps) {
  const rows: Row[] = [
    { label: 'Energia no período', unit: 'kWh', digits: 3, barClass: 'bg-amber-400', get: (s) => periodTotals.get(s.id)?.energyKwh ?? null },
    { label: 'Emissão no período', unit: 'kgCO₂e', digits: 4, barClass: 'bg-violet-400', get: (s) => periodTotals.get(s.id)?.co2eKg ?? null },
    { label: 'Intensidade da região', unit: 'g/kWh', digits: 0, barClass: 'bg-cyan-400', get: (s) => s.intensity },
    { label: 'Potência estimada', unit: 'W', digits: 1, barClass: 'bg-lime-400', get: (s) => s.powerWatts },
    { label: 'CPU', unit: '%', digits: 1, barClass: 'bg-zinc-300', get: (s) => s.metrics?.cpu_percent ?? null },
    { label: 'Memória', unit: 'GB', digits: 2, barClass: 'bg-zinc-300', get: (s) => s.metrics?.memory_gb ?? null },
    { label: 'Disco', unit: 'GB', digits: 1, barClass: 'bg-zinc-300', get: (s) => s.metrics?.disk_gb ?? null },
    { label: 'Renováveis na matriz', unit: '%', digits: 0, barClass: 'bg-emerald-400', get: (s) => s.renewableShare },
  ]

  if (services.length < 2) {
    return (
      <GlassCard className="flex items-center gap-3 border-dashed text-sm text-zinc-400">
        <GitCompareArrows className="size-5 shrink-0 text-lime-400" aria-hidden="true" />
        Marque dois ou mais serviços na tabela acima para abrir o painel comparativo lado a lado.
      </GlassCard>
    )
  }

  return (
    <GlassCard aria-labelledby="compare-title">
      <CardHeading
        eyebrow="Comparação entre serviços"
        title={`${services.length} serviços · mesmo período, mesmas unidades`}
        id="compare-title"
        aside={
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-400/40 hover:text-zinc-50"
          >
            Limpar seleção
          </button>
        }
      />
      <p className="-mt-2 mb-4 text-xs text-ink-subtle">Período: {periodLabel}. As barras são relativas ao maior valor entre os selecionados.</p>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}>
        {services.map((s) => (
          <article key={s.id} className="rounded-xl border border-white/[0.08] bg-zinc-950/40 p-4">
            <header className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-zinc-100">{s.name}</h3>
                <p className="truncate text-xs text-ink-subtle">
                  {[s.location.city, s.location.country].filter(Boolean).join(', ')} · {s.location.region_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                aria-label={`Remover ${s.name} da comparação`}
                className="grid size-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-white/5 hover:text-zinc-200"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>
            <StatusBadge status={s.status} className="mb-4" />
            <dl className="flex flex-col gap-3">
              {rows.map((row) => {
                const value = row.get(s)
                const max = Math.max(1e-9, ...services.map((x) => row.get(x) ?? 0))
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <dt className="text-zinc-400">{row.label}</dt>
                      <dd className="font-mono tabular-nums text-zinc-200">
                        {value == null ? '—' : `${formatNumber(value, row.digits)} ${row.unit}`}
                      </dd>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                      <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${((value ?? 0) / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </dl>
          </article>
        ))}
      </div>
    </GlassCard>
  )
}
