import { CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ServiceStatus } from '@/lib/types'

interface StatusMeta {
  label: string
  /** Texto longo exibido no selo (badge) dos cartões. */
  badgeLabel: string
  description: string
  icon: LucideIcon
  badgeClass: string
  dotClass: string
  hex: string
}

export const STATUS_META: Record<ServiceStatus, StatusMeta> = {
  active: {
    label: 'Ativo',
    badgeLabel: 'Ativo e Monitorado',
    description: 'Respondendo e exportando métricas',
    icon: CircleCheck,
    badgeClass: 'text-state-ok bg-state-ok/10 ring-state-ok/40',
    dotClass: 'bg-state-ok',
    hex: '#4ade80',
  },
  unavailable: {
    label: 'Indisponível',
    badgeLabel: 'Serviço Indisponível',
    description: 'Não respondeu à consulta de métricas',
    icon: TriangleAlert,
    badgeClass: 'text-state-down bg-state-down/10 ring-state-down/40',
    dotClass: 'bg-state-down',
    hex: '#f87171',
  },
  no_metrics: {
    label: 'Sem métricas',
    badgeLabel: 'Sem Métricas',
    description: 'Listado em /services, mas sem exportar métricas',
    icon: CircleDashed,
    badgeClass: 'text-state-warn bg-state-warn/10 ring-state-warn/40',
    dotClass: 'bg-state-warn',
    hex: '#fbbf24',
  },
}
