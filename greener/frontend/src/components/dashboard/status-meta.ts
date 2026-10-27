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
    badgeClass: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/30',
    dotClass: 'bg-emerald-400',
    hex: '#34d399',
  },
  unavailable: {
    label: 'Indisponível',
    badgeLabel: 'Serviço Indisponível',
    description: 'Não respondeu à consulta de métricas',
    icon: TriangleAlert,
    badgeClass: 'text-rose-300 bg-rose-400/10 ring-rose-400/30',
    dotClass: 'bg-rose-400',
    hex: '#fb7185',
  },
  no_metrics: {
    label: 'Sem métricas',
    badgeLabel: 'Sem Métricas',
    description: 'Listado em /services, mas sem exportar métricas',
    icon: CircleDashed,
    badgeClass: 'text-amber-300 bg-amber-400/10 ring-amber-400/30',
    dotClass: 'bg-amber-400',
    hex: '#fbbf24',
  },
}
