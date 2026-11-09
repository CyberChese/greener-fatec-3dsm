import { Cloud, MapPinOff, Zap } from 'lucide-react'
import { formatGb, formatIntensity, formatKg, formatKwh, formatPercent, formatTime, formatWatts } from '@/lib/format'
import type { ServiceSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { STATUS_META } from './status-meta'

export interface ServiceCardProps {
  service: ServiceSnapshot
  /** Energia e emissão acumuladas no período; ausente quando o backend ainda não as fornece. */
  totals?: { energyKwh: number; co2eKg: number }
  selected: boolean
  highlighted: boolean
  onToggle: (id: string) => void
}

/**
 * Cartão de um serviço (TASK-025). O estado aparece em selo colorido com ícone e texto
 * (nunca só pela cor, RNF02) e a explicação do estado fica sempre visível.
 */
export function ServiceCard({ service: s, totals, selected, highlighted, onToggle }: ServiceCardProps) {
  const hasCoords = s.location.latitude != null && s.location.longitude != null
  const meta = STATUS_META[s.status]

  return (
    <article
      data-status={s.status}
      className={cn(
        'flex h-full flex-col gap-4 rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-4 transition-colors',
        s.status === 'unavailable' && 'border-state-down/30',
        selected && 'border-lime-400/30 bg-lime-400/[0.04]',
        highlighted && 'ring-1 ring-lime-400/50',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-zinc-100">{s.name}</h3>
          <p className="truncate font-mono text-xs text-ink-subtle">{s.id}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" className="size-4 accent-lime-400" checked={selected} onChange={() => onToggle(s.id)} />
          Comparar
        </label>
      </header>

      <div className="flex flex-col gap-1.5">
        <StatusBadge status={s.status} className="self-start" />
        <p className="text-xs text-zinc-400">{meta.description}</p>
        {s.errorMessage ? <p className="text-xs break-words text-ink-subtle">{s.errorMessage}</p> : null}
      </div>

      <div className="text-sm text-zinc-300">
        <p>{s.location.country || 'País não informado'}</p>
        <p className="text-xs text-ink-subtle">
          {s.location.region || 'Região não informada'}
          {s.location.city ? ` · ${s.location.city}` : ' · cidade não informada'}
        </p>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Nuvem: <span className="font-mono text-zinc-300">{s.location.region_code || 'não informada'}</span>
        </p>
        {!hasCoords ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-subtle">
            <MapPinOff className="size-3" aria-hidden="true" /> sem coordenadas
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-400">
          Consumo atual
          {s.metricsAt ? <span className="font-normal text-ink-subtle"> · coleta das {formatTime(s.metricsAt)}</span> : null}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Metric label="CPU" value={formatPercent(s.metrics?.cpu_percent ?? null)} />
          <Metric label="Memória" value={formatGb(s.metrics?.memory_gb ?? null)} />
          <Metric label="Disco" value={formatGb(s.metrics?.disk_gb ?? null)} />
          <Metric label="Rede" value={formatGb(s.metrics?.network_gb ?? null)} />
        </dl>
        <p className="mt-1.5 text-xs text-ink-subtle">
          Potência estimada: <span className="font-mono text-zinc-300">{formatWatts(s.powerWatts)}</span>
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-amber-400/10 p-3">
          <p className="flex items-center gap-1 text-xs text-amber-300">
            <Zap className="size-3.5" aria-hidden="true" /> Energia
          </p>
          <p className="font-mono text-sm tabular-nums text-zinc-100">
            {formatKwh(totals?.energyKwh ?? null)} <span className="text-xs text-zinc-400">kWh</span>
          </p>
        </div>
        <div className="rounded-xl bg-violet-400/10 p-3">
          <p className="flex items-center gap-1 text-xs text-violet-300">
            <Cloud className="size-3.5" aria-hidden="true" /> Emissão
          </p>
          <p className="font-mono text-sm tabular-nums text-zinc-100">
            {formatKg(totals?.co2eKg ?? null)} <span className="text-xs text-zinc-400">kgCO₂e</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-ink-subtle">
        Intensidade da região: <span className="font-mono text-zinc-300">{formatIntensity(s.intensity)}</span> gCO₂e/kWh
      </p>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="font-mono tabular-nums text-zinc-200">{value}</dd>
    </div>
  )
}
