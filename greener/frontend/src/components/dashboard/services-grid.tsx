import { GlassCard } from './glass-card'
import { ServiceCard } from './service-card'
import type { ServicesTableProps } from './services-table'

/** Classes da grade: 1 coluna no celular, 2 no tablet, 3 no desktop e 4 em telas largas. */
export const SERVICES_GRID_CLASSES = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

/** Grade de cartões dos serviços monitorados (TASK-025). */
export function ServicesGrid({ services, periodTotals, selectedIds, onToggle, highlightId }: ServicesTableProps) {
  if (services.length === 0) {
    return (
      <GlassCard className="text-center text-sm text-zinc-400">Nenhum serviço corresponde aos filtros aplicados.</GlassCard>
    )
  }

  return (
    <ul aria-label="Serviços monitorados" className={SERVICES_GRID_CLASSES}>
      {services.map((s) => (
        <li key={s.id}>
          <ServiceCard
            service={s}
            totals={periodTotals.get(s.id)}
            selected={selectedIds.includes(s.id)}
            highlighted={highlightId === s.id}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  )
}
