import type { Metrics, ServiceSnapshot, ServiceStatus } from '@/lib/types'
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
    backendId: service.idServices,
    metricsAt: null,
  }
}

/** GET /api/services (rota pública). */
export async function fetchBackendServices(): Promise<ServiceSnapshot[]> {
  const { data } = await publicApi.get<BackendService[]>('/services')
  return data.map(mapBackendService)
}

/** Uma linha de GET /api/services/:id/history. Colunas numeric/bigint chegam como texto. */
export interface BackendCollection {
  idCollections: string
  service_id: string
  /** Percentual (0 a 100). */
  cpu_usage: string | number | null
  /** GB. */
  memory_usage: string | number | null
  /** GB. */
  storage_usage: string | number | null
  /** GB. */
  network_io: string | number | null
  timestamp: string
}

/** Converte uma coleta em métricas. Se qualquer valor faltar, devolve null (nunca preenche com zero). */
export function mapCollectionToMetrics(collection: BackendCollection): Metrics | null {
  const cpu = toNumber(collection.cpu_usage)
  const memory = toNumber(collection.memory_usage)
  const disk = toNumber(collection.storage_usage)
  const network = toNumber(collection.network_io)
  if (cpu === null || memory === null || disk === null || network === null) return null
  return { cpu_percent: cpu, memory_gb: memory, disk_gb: disk, network_gb: network }
}

export interface HistoryRange {
  from?: string
  to?: string
}

/** GET /api/services/:id/history (rota pública), em ordem cronológica crescente. */
export async function fetchServiceHistory(backendId: string, range: HistoryRange = {}): Promise<BackendCollection[]> {
  const { data } = await publicApi.get<BackendCollection[]>(`/services/${encodeURIComponent(backendId)}/history`, {
    params: range,
  })
  return data
}

/** Janela consultada para achar a coleta mais recente de cada serviço. */
export const LATEST_WINDOW_MS = 15 * 60_000
/** O worker coleta a cada ~30 s; consultar o histórico com mais frequência não traz dado novo. */
export const METRICS_TTL_MS = 10_000

export interface LatestMetrics {
  metrics: Metrics | null
  at: string | null
  fetchedAt: number
}
export type LatestMetricsCache = Map<string, LatestMetrics>

interface AttachOptions {
  now?: number
  fetchHistory?: typeof fetchServiceHistory
}

/**
 * Preenche as métricas (CPU, memória, disco e rede) de cada serviço ativo com a coleta mais recente do histórico.
 * Nunca lança: se a consulta falhar, mantém a última leitura guardada; sem leitura, o valor fica nulo ("—").
 */
export async function attachLatestMetrics(
  snapshots: ServiceSnapshot[],
  cache: LatestMetricsCache,
  { now = Date.now(), fetchHistory = fetchServiceHistory }: AttachOptions = {},
): Promise<ServiceSnapshot[]> {
  return Promise.all(
    snapshots.map(async (snapshot) => {
      if (snapshot.status !== 'active' || !snapshot.backendId) return snapshot
      const id = snapshot.backendId

      let entry = cache.get(id)
      let failed = false
      if (!entry || now - entry.fetchedAt >= METRICS_TTL_MS) {
        try {
          const records = await fetchHistory(id, { from: new Date(now - LATEST_WINDOW_MS).toISOString() })
          const latest = records.reduce<BackendCollection | null>(
            (best, r) => (best === null || Date.parse(r.timestamp) >= Date.parse(best.timestamp) ? r : best),
            null,
          )
          entry = { metrics: latest ? mapCollectionToMetrics(latest) : null, at: latest?.timestamp ?? null, fetchedAt: now }
          cache.set(id, entry)
        } catch {
          failed = true
        }
      }

      if (!entry) return { ...snapshot, errorMessage: 'Não foi possível ler as métricas deste serviço' }
      return {
        ...snapshot,
        metrics: entry.metrics,
        metricsAt: entry.at,
        errorMessage: failed
          ? 'Métricas desatualizadas: a última consulta falhou'
          : entry.metrics
            ? null
            : 'Sem coleta de métricas nos últimos 15 minutos',
      }
    }),
  )
}
