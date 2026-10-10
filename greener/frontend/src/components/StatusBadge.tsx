import type { ReactNode } from 'react'
import type { ServiceState } from '../types/service.ts'

type StateStyle = {
  label: string
  className: string
  icon: ReactNode
}

// Cada estado combina cor, forma e texto: a informação nunca depende só da cor (RNF02).
const STATE_STYLES: Record<ServiceState, StateStyle> = {
  available: {
    label: 'Ativo',
    className: 'border-state-ok/40 bg-state-ok/10 text-state-ok',
    icon: <circle cx="6" cy="6" r="5" fill="currentColor" />,
  },
  metrics_missing: {
    label: 'Sem métricas',
    className: 'border-state-warn/40 bg-state-warn/10 text-state-warn',
    icon: <polygon points="6,0.5 11.5,6 6,11.5 0.5,6" fill="currentColor" />,
  },
  unavailable: {
    label: 'Indisponível',
    className: 'border-state-down/40 bg-state-down/10 text-state-down',
    icon: <polygon points="6,0.5 11.5,11 0.5,11" fill="currentColor" />,
  },
  removed: {
    label: 'Removido',
    className: 'border-state-removed/40 bg-state-removed/10 text-state-removed',
    icon: <rect x="1" y="1" width="10" height="10" fill="currentColor" />,
  },
}

type StatusBadgeProps = {
  state: ServiceState
}

export function StatusBadge({ state }: StatusBadgeProps) {
  const { label, className, icon } = STATE_STYLES[state]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-medium ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </span>
  )
}
