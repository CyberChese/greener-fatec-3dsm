import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { IS_SIMULATED } from '@/lib/dataSource'
import { formatNumber } from '@/lib/format'
import type { SeriesPoint } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  label?: string | number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as SeriesPoint | undefined
  if (!point) return null
  return (
    <div role="tooltip" aria-live="polite" className="rounded-xl border border-white/10 bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 font-medium text-zinc-300">Coleta #{point.tick} · {label}</p>
      <p className="flex justify-between gap-6 text-amber-300">
        <span>Energia</span>
        <span className="font-mono">{formatNumber(point.energyKwh, 3)} kWh</span>
      </p>
      <p className="flex justify-between gap-6 text-violet-300">
        <span>Emissão</span>
        <span className="font-mono">{formatNumber(point.co2eKg, 4)} kgCO₂e</span>
      </p>
      <p className="mt-1.5 text-ink-subtle">
        {point.active} ativos · {point.unavailable} indisp. · {point.noMetrics} sem métricas
      </p>
    </div>
  )
}

export function EvolutionChart({ series }: { series: SeriesPoint[] }) {
  return (
    <GlassCard aria-labelledby="evolution-title">
      <CardHeading
        eyebrow="Evolução temporal"
        title="Energia e emissões por coleta"
        id="evolution-title"
        aside={<span className="text-xs text-ink-subtle">Últimas {series.length} coletas · {IS_SIMULATED ? 'horário simulado' : 'horário real'}</span>}
      />
      <div className="h-72">
        {series.length < 2 ? (
          <div className="grid h-full place-items-center text-sm text-ink-subtle">Aguardando coletas suficientes…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart accessibilityLayer data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                yAxisId="energy"
                tick={{ fill: '#fbbf24', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v, 2)}
                width={48}
              />
              <YAxis
                yAxisId="co2"
                orientation="right"
                tick={{ fill: '#a78bfa', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v, 3)}
                width={52}
              />
              <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload} label={props.label} />} cursor={{ stroke: 'rgba(163,230,53,0.4)' }} />
              <Line
                yAxisId="energy"
                type="monotone"
                dataKey="energyKwh"
                name="Energia (kWh)"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="co2"
                type="monotone"
                dataKey="co2eKg"
                name="Emissão (kgCO₂e)"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex gap-5 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-amber-400" aria-hidden="true" /> Energia (kWh, linha contínua, eixo esquerdo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-violet-400" aria-hidden="true" /> Emissão (kgCO₂e, linha tracejada, eixo direito)
        </span>
      </div>
    </GlassCard>
  )
}
