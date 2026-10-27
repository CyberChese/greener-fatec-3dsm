import { LayoutGrid, Table2 } from 'lucide-react'
import { useState } from 'react'
import type { ServiceStatus } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'
import { ServicesGrid } from './services-grid'
import { ServicesTable, type ServicesTableProps } from './services-table'
import { StatusBadge } from './status-badge'
import { STATUS_META } from './status-meta'

type ViewMode = 'cards' | 'table'

const MODES: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'cards', label: 'Cartões', icon: LayoutGrid },
  { id: 'table', label: 'Tabela', icon: Table2 },
]

function StatusLegend() {
  const statuses = Object.keys(STATUS_META) as ServiceStatus[]
  return (
    <ul aria-label="Legenda dos estados" className="grid gap-3 sm:grid-cols-3">
      {statuses.map((status) => (
        <li key={status} className="flex flex-col items-start gap-1.5">
          <StatusBadge status={status} />
          <span className="text-xs text-zinc-400">{STATUS_META[status].description}</span>
        </li>
      ))}
    </ul>
  )
}

/** Serviços monitorados em cartões (padrão, melhor no celular) ou em tabela detalhada. */
export function ServicesSection(props: ServicesTableProps) {
  const [mode, setMode] = useState<ViewMode>('cards')

  return (
    <div className="flex flex-col gap-4">
      <GlassCard aria-labelledby="services-title">
        <CardHeading
          eyebrow="Dashboard operacional"
          title="Serviços monitorados"
          id="services-title"
          aside={
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-500">
                {props.selectedIds.length} selecionado(s) para comparação · totais: {props.periodLabel}
              </span>
              <div className="flex rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label="Modo de exibição">
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => setMode(id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${
                      mode === id ? 'bg-lime-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <StatusLegend />
      </GlassCard>

      {mode === 'cards' ? <ServicesGrid {...props} /> : <ServicesTable {...props} embedded />}
    </div>
  )
}
