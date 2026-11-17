import { GitCompareArrows, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CollectionRecord, ServiceSnapshot } from '@/lib/types'
import { formatDateTime, formatKg, formatKwh, formatNumber } from '@/lib/format'
import { useServiceComparison } from '@/hooks/use-service-comparison'
import { CardHeading, GlassCard } from './glass-card'
import { StatusBadge } from './status-badge'
import {
  buildComparisonPoints,
  COMPARISON_COLORS,
  MAX_COMPARED_SERVICES,
  summarizeBackendImpactComparison,
  summarizeImpactComparison,
  type ComparisonPoint,
  type ComparisonValues,
} from './comparison-data'

interface ComparisonPanelProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  periodLabel: string
  simulatedHistory: CollectionRecord[]
  simulated: boolean
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

type ComparisonMetric = keyof ComparisonValues
const EMPTY_HIDDEN_IDS = new Set<string>()

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  services: ServiceSnapshot[]
  metric: ComparisonMetric
}

function isComparisonPoint(value: unknown): value is ComparisonPoint {
  if (typeof value !== 'object' || value === null || !('timestamp' in value) || !('values' in value)) return false
  return typeof value.timestamp === 'number' && typeof value.values === 'object' && value.values !== null
}

export function ComparisonChartTooltip({ active, payload, services, metric }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload.map((item) => item.payload).find(isComparisonPoint)
  if (!point) return null

  const unit = metric === 'energyKwh' ? 'kWh' : 'kgCO₂e'
  return (
    <div role="tooltip" className="min-w-52 rounded-xl border border-white/10 bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-medium text-zinc-300">{formatDateTime(new Date(point.timestamp))}</p>
      <ul className="flex flex-col gap-1.5">
        {services.map((service, index) => {
          const value = point.values[service.id]?.[metric] ?? null
          const formatted = value == null ? '—' : `${metric === 'energyKwh' ? formatKwh(value) : formatKg(value)} ${unit}`
          return (
            <li key={service.id} className="flex items-center justify-between gap-5">
              <span className="inline-flex min-w-0 items-center gap-2 text-zinc-300">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="truncate">{service.name}</span>
              </span>
              <span className="shrink-0 font-mono text-zinc-100">{formatted}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ChartLegend({
  services,
  hiddenIds,
  onToggle,
}: {
  services: ServiceSnapshot[]
  hiddenIds: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div role="group" aria-label="Visibilidade dos serviços no gráfico" className="mb-3 flex flex-wrap gap-2">
      {services.map((service, index) => {
        const visible = !hiddenIds.has(service.id)
        return (
          <button
            key={service.id}
            type="button"
            aria-label={`Visibilidade de ${service.name}`}
            aria-pressed={visible}
            onClick={() => onToggle(service.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              visible ? 'border-white/10 text-zinc-200' : 'border-edge text-ink-subtle line-through'
            }`}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }}
              aria-hidden="true"
            />
            {service.name}
          </button>
        )
      })}
    </div>
  )
}

function MetricChart({
  title,
  metric,
  unit,
  services,
  points,
  hiddenIds,
}: {
  title: string
  metric: ComparisonMetric
  unit: string
  services: ServiceSnapshot[]
  points: ComparisonPoint[]
  hiddenIds: Set<string>
}) {
  const formatTick = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-white/[0.08] bg-zinc-950/30 p-3">
      <h3 className="mb-2 text-sm font-medium text-zinc-200">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTick}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                metric === 'energyKwh' ? formatKwh(value) : formatKg(value)
              }
              width={56}
              label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#a1a1aa', fontSize: 11 }}
            />
            <Tooltip content={(props) => <ComparisonChartTooltip {...props} services={services} metric={metric} />} />
            {services.map((service, index) => (
              <Line
                key={service.id}
                type="monotone"
                dataKey={(point: ComparisonPoint) => point.values[service.id]?.[metric] ?? null}
                name={service.name}
                stroke={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                hide={hiddenIds.has(service.id)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function ComparisonPanel({
  services,
  periodTotals,
  periodLabel,
  simulatedHistory,
  simulated,
  onRemove,
  onClear,
}: ComparisonPanelProps) {
  const serviceKey = services.map((service) => service.id).join('\u0000')
  const [visibility, setVisibility] = useState<{ key: string; hiddenIds: Set<string> }>({
    key: serviceKey,
    hiddenIds: new Set(),
  })
  const hiddenIds = visibility.key === serviceKey ? visibility.hiddenIds : EMPTY_HIDDEN_IDS
  const { result: realComparison, loading, error } = useServiceComparison(services, !simulated)
  const points = useMemo(
    () => buildComparisonPoints(services, simulated ? simulatedHistory : [], simulated ? [] : realComparison?.series ?? []),
    [services, simulated, simulatedHistory, realComparison],
  )
  const impactSummary = useMemo(
    () =>
      simulated
        ? summarizeImpactComparison(services, points)
        : realComparison
          ? summarizeBackendImpactComparison(services, realComparison)
          : null,
    [services, points, simulated, realComparison],
  )

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
        Marque pelo menos dois serviços na lista acima para ver a comparação. O limite é de {MAX_COMPARED_SERVICES} serviços.
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
      <p className="-mt-2 mb-4 text-xs text-ink-subtle">
        Período: {periodLabel}. Alterne a visibilidade das linhas pela legenda.
      </p>

      <section aria-labelledby="impact-savings-title" className="mb-5 rounded-xl border border-lime-400/20 bg-lime-400/[0.06] p-4">
        <h3 id="impact-savings-title" className="text-sm font-semibold text-lime-200">
          Economia de emissões entre os serviços comparados
        </h3>
        {impactSummary ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong className="text-2xl font-semibold tabular-nums text-lime-300">
              {formatNumber(impactSummary.savingsPercent, 1)}%
            </strong>
            <p className="text-sm text-zinc-200">
              comparando <span className="font-medium">{impactSummary.mostEfficient.name}</span> (
              {formatKg(impactSummary.mostEfficientKg)} kgCO₂e) com{' '}
              <span className="font-medium">{impactSummary.leastEfficient.name}</span> (
              {formatKg(impactSummary.leastEfficientKg)} kgCO₂e).
            </p>
            <p className="w-full text-xs text-ink-subtle">
              Baseado em {impactSummary.mostEfficientSamples} e {impactSummary.leastEfficientSamples} coleta(s) com emissão medida,
              respectivamente. Coletas sem medição não são tratadas como zero.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-subtle">
            Sem medições de energia suficientes em pelo menos dois serviços para calcular a economia.
          </p>
        )}
      </section>

      {loading ? <p role="status" className="mb-3 text-sm text-ink-subtle">Carregando histórico dos serviços selecionados…</p> : null}
      {error ? (
        <p role="alert" className="mb-3 text-sm text-state-down">
          Não foi possível atualizar parte do histórico: {error}
        </p>
      ) : null}
      {!loading && points.length === 0 ? (
        <p className="mb-3 rounded-lg border border-dashed border-edge px-4 py-6 text-center text-sm text-ink-subtle">
          Nenhuma coleta com energia ou emissão disponível para o período selecionado.
        </p>
      ) : null}
      {points.length > 0 ? (
        <>
          <ChartLegend
            services={services}
            hiddenIds={hiddenIds}
            onToggle={(id) =>
              setVisibility((previous) => {
                const next = new Set(previous.key === serviceKey ? previous.hiddenIds : EMPTY_HIDDEN_IDS)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return { key: serviceKey, hiddenIds: next }
              })
            }
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <MetricChart
              title="Evolução do consumo energético"
              metric="energyKwh"
              unit="kWh"
              services={services}
              points={points}
              hiddenIds={hiddenIds}
            />
            <MetricChart
              title="Evolução das emissões"
              metric="co2eKg"
              unit="kgCO₂e"
              services={services}
              points={points}
              hiddenIds={hiddenIds}
            />
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Passe o cursor sobre uma coleta para ver os valores dos serviços naquele instante. A ausência de medição aparece como “—”.
          </p>
        </>
      ) : null}

      <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
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
                const max = Math.max(1e-9, ...services.map((service) => row.get(service) ?? 0))
                const width = value == null ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <dt className="text-zinc-400">{row.label}</dt>
                      <dd className="font-mono tabular-nums text-zinc-200">
                        {value == null ? '—' : `${formatNumber(value, row.digits)} ${row.unit}`}
                      </dd>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                      <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${width}%` }} />
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
