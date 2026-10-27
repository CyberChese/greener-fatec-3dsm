import type { ServiceSnapshot, ServiceStatus } from '@/lib/types'
import { publicApi } from './http.ts'

/** Formato devolvido por GET /api/services (entidade Service do backend). */
export interface BackendService {
  idServices: string
  external_id: string
  nameServices: string
  status: string
  country: string | null
  region: string | null
  city: string | null
  /** Colunas numeric do PostgreSQL chegam como texto. */
  latitude: string | number | null
  longitude: string | number | null
  last_observed_at: string | null
}

const STATUS_MAP: Record<string, ServiceStatus> = {
  ACTIVE: 'active',
  UNAVAILABLE: 'unavailable',
  NO_METRICS: 'no_metrics',
}

function toNumber(value: string | number | null): number | null {
  if (value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const STATUS_NOTE: Record<ServiceStatus, string | null> = {
  active: null,
  unavailable: 'Não respondeu à última coleta',
  no_metrics: 'Listado, mas sem exportar métricas',
}

/**
 * Converte um serviço do backend no formato da tela. Energia, CO2e e intensidade ficam nulos
 * (aparecem como "—") porque o backend ainda não calcula nem expõe esses valores.
 */
export function mapBackendService(service: BackendService): ServiceSnapshot {
  const status = STATUS_MAP[service.status] ?? 'no_metrics'
  return {
    id: service.external_id || service.idServices,
    name: service.nameServices,
    location: {
      region_code: service.region ?? '',
      country: service.country ?? '',
      region: service.region ?? '',
      city: service.city,
      latitude: toNumber(service.latitude),
      longitude: toNumber(service.longitude),
    },
    status,
    metrics: null,
    intensity: null,
    renewableShare: null,
    powerWatts: null,
    energyKwh: null,
    co2eKg: null,
    errorMessage: STATUS_NOTE[status],
  }
}

/** GET /api/services (rota pública). */
export async function fetchBackendServices(): Promise<ServiceSnapshot[]> {
  const { data } = await publicApi.get<BackendService[]>('/services')
  return data.map(mapBackendService)
}
