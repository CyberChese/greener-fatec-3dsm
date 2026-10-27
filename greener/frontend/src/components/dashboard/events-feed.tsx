import { CircleCheck, CircleMinus, CirclePlus, ServerCrash, TriangleAlert, type LucideIcon } from 'lucide-react'
import { formatSimulatedClock } from '@/lib/format'
import type { EnvironmentEvent, EnvironmentEventKind } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'

const EVENT_META: Record<EnvironmentEventKind, { icon: LucideIcon; className: string; label: string }> = {
  added: { icon: CirclePlus, className: 'text-sky-300', label: 'Novo' },
  removed: { icon: CircleMinus, className: 'text-zinc-400', label: 'Removido' },
  recovered: { icon: CircleCheck, className: 'text-state-ok', label: 'Recuperado' },
  down: { icon: TriangleAlert, className: 'text-state-down', label: 'Alerta' },
  api_error: { icon: ServerCrash, className: 'text-orange-300', label: 'Falha de API' },
}

export function EventsFeed({ events }: { events: EnvironmentEvent[] }) {
  return (
    <GlassCard aria-labelledby="events-title">
      <CardHeading eyebrow="Monitoramento dinâmico" title="Eventos do ambiente" id="events-title" />
      {events.length === 0 ? (
        <p className="text-sm text-ink-subtle">Nenhuma mudança detectada até agora.</p>
      ) : (
        <ul className="flex flex-col gap-2.5" aria-live="polite">
          {events.map((event) => {
            const meta = EVENT_META[event.kind]
            const Icon = meta.icon
            return (
              <li key={event.id} className="flex items-start gap-2.5 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-zinc-200">
                    <span className={`mr-1.5 text-xs font-semibold ${meta.className}`}>{meta.label}:</span>
                    {event.message}
                  </p>
                  <p className="font-mono text-xs text-ink-subtle">{formatSimulatedClock(event.simulatedAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}
