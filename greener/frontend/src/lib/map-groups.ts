import type { ServiceSnapshot, ServiceStatus } from '@/lib/types'

/** Serviços que ocupam exatamente a mesma coordenada (mesmo datacenter/cidade) compartilham um marcador. */
export interface LocationGroup {
  key: string
  latitude: number
  longitude: number
  services: ServiceSnapshot[]
  /** Pior estado do grupo: indisponível > sem métricas > ativo. */
  status: ServiceStatus
}

const SEVERITY: Record<ServiceStatus, number> = { active: 0, no_metrics: 1, unavailable: 2 }

export const hasCoordinates = (s: ServiceSnapshot) => s.location.latitude != null && s.location.longitude != null

export function worstStatus(services: ServiceSnapshot[]): ServiceStatus {
  return services.reduce<ServiceStatus>((worst, s) => (SEVERITY[s.status] > SEVERITY[worst] ? s.status : worst), 'active')
}

/** Agrupa por coordenada; serviços sem latitude/longitude ficam de fora (use servicesWithoutCoordinates). */
export function groupByLocation(services: ServiceSnapshot[]): LocationGroup[] {
  const groups = new Map<string, ServiceSnapshot[]>()
  for (const s of services) {
    if (!hasCoordinates(s)) continue
    const key = `${s.location.latitude},${s.location.longitude}`
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    latitude: list[0].location.latitude as number,
    longitude: list[0].location.longitude as number,
    services: list,
    status: worstStatus(list),
  }))
}

export const servicesWithoutCoordinates = (services: ServiceSnapshot[]) => services.filter((s) => !hasCoordinates(s))

/** O backend ainda não guarda o provedor de nuvem (só país, região e coordenadas); nada é inventado. */
export const CLOUD_PROVIDER_UNKNOWN = 'não informado pelo backend'
