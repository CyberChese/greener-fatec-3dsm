import type { Metrics, ServiceSnapshot, ServiceStatus } from '@/lib/types'
import { publicApi } from './http.ts'

/** Formato devolvido por GET /api/services (entidade Service do backend). */
export interface BackendService {
  idServices: string
  external_id: string
  nameServices: string
  region_code?: string | null
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
 * Converte um serviço do backend no formato da tela. Energia, CO2e e intensidade começam nulos
 * (aparecem como "—") e são preenchidos por attachLatestMetrics a partir do histórico de coletas.
 */
export function mapBackendService(service: BackendService): ServiceSnapshot {
  const status = STATUS_MAP[service.status] ?? 'no_metrics'
  return {
    id: service.external_id || service.idServices,
    name: service.nameServices,
    location: {
      region_code: service.region_code ?? service.region ?? '',
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
export async function fetchBackendServices(signal?: AbortSignal): Promise<ServiceSnapshot[]> {
  const { data } = await publicApi.get<BackendService[]>('/services', { signal })
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
  /** Energia estimada da coleta, em kWh. Nula em coletas anteriores ao cálculo (ou se o cálculo falhou). */
  energy_kwh?: string | number | null
  /** Intensidade de carbono usada na coleta, em gCO2e/kWh. */
  carbon_intensity_gco2e_per_kwh?: string | number | null
  /** Emissão da coleta em gramas e em quilogramas de CO2e. */
  co2e_g?: string | number | null
  co2e_kg?: string | number | null
  /** true quando a intensidade veio do valor padrão. */
  carbon_intensity_fallback?: boolean | null
  timestamp: string
}

/** Energia e emissão de um serviço somadas sobre as coletas de uma janela. */
export interface WindowImpact {
  /** Soma de energy_kwh; null se nenhuma coleta da janela trouxe o valor (nunca zero por falta de dado). */
  energyKwh: number | null
  /** Soma de co2e_kg; null se nenhuma coleta da janela trouxe o valor. */
  co2eKg: number | null
  /** Intensidade (gCO2e/kWh) da coleta mais recente que a informou. */
  intensity: number | null
  intensityFallback: boolean | null
  /** Quantas coletas da janela entraram na soma de energia. */
  samples: number
}

/**
 * Soma energia e CO2e das coletas recebidas. Coletas sem o valor são ignoradas (não valem zero);
 * se nenhuma tiver o valor, o resultado é null e a tela mostra "—".
 */
export function summarizeImpact(records: BackendCollection[]): WindowImpact {
  let energy = 0
  let co2e = 0
  let samples = 0
  let co2eSamples = 0
  let latest: BackendCollection | null = null
  let latestAt = -Infinity

  for (const record of records) {
    const kwh = toNumber(record.energy_kwh ?? null)
    if (kwh !== null) {
      energy += kwh
      samples++
    }

    const kg = toNumber(record.co2e_kg ?? null)
    const grams = toNumber(record.co2e_g ?? null)
    const emission = kg ?? (grams === null ? null : grams / 1000)
    if (emission !== null) {
      co2e += emission
      co2eSamples++
    }

    const at = Date.parse(record.timestamp)
    if (toNumber(record.carbon_intensity_gco2e_per_kwh ?? null) !== null && at >= latestAt) {
      latest = record
      latestAt = at
    }
  }

  return {
    energyKwh: samples > 0 ? energy : null,
    co2eKg: co2eSamples > 0 ? co2e : null,
    intensity: latest ? toNumber(latest.carbon_intensity_gco2e_per_kwh ?? null) : null,
    intensityFallback: latest ? (latest.carbon_intensity_fallback ?? null) : null,
    samples,
  }
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
export async function fetchServiceHistory(
  backendId: string,
  range: HistoryRange = {},
  signal?: AbortSignal,
): Promise<BackendCollection[]> {
  const { data } = await publicApi.get<BackendCollection[]>(`/services/${encodeURIComponent(backendId)}/history`, {
    params: range,
    signal,
  })
  return data
}

/** Janela do histórico consultada para achar a coleta mais recente e somar energia e CO2e de cada serviço. */
export const LATEST_WINDOW_MS = 15 * 60_000

/** Texto do período de referência de energia e CO2e por serviço no modo real (IHC03). */
export const IMPACT_WINDOW_LABEL = `últimos ${LATEST_WINDOW_MS / 60_000} min`

/** O worker coleta a cada ~30 s; consultar o histórico com mais frequência não traz dado novo. */
export const METRICS_TTL_MS = 10_000

export interface LatestMetrics {
  metrics: Metrics | null
  at: string | null
  /** Energia e CO2e somadas sobre as coletas da janela (LATEST_WINDOW_MS). */
  impact: WindowImpact | null
  fetchedAt: number
}
export type LatestMetricsCache = Map<string, LatestMetrics>

interface AttachOptions {
  now?: number
  fetchHistory?: typeof fetchServiceHistory
  signal?: AbortSignal
}

/**
 * Preenche cada serviço ativo com a coleta mais recente do histórico (CPU, memória, disco e rede) e com a energia
 * e o CO2e somados sobre as coletas da janela de 15 minutos. A mesma resposta alimenta os dois, sem requisição extra.
 * Nunca lança em falha de rede (mantém a última leitura guardada; sem leitura, o valor fica nulo "—"),
 * exceto quando a requisição é explicitamente cancelada via AbortSignal.
 */
export async function attachLatestMetrics(
  snapshots: ServiceSnapshot[],
  cache: LatestMetricsCache,
  { now = Date.now(), fetchHistory = fetchServiceHistory, signal }: AttachOptions = {},
): Promise<ServiceSnapshot[]> {
  return Promise.all(
    snapshots.map(async (snapshot) => {
      if (snapshot.status !== 'active' || !snapshot.backendId) return snapshot
      const id = snapshot.backendId

      let entry = cache.get(id)
      let failed = false
      if (!entry || now - entry.fetchedAt >= METRICS_TTL_MS) {
        try {
          const records = await fetchHistory(id, { from: new Date(now - LATEST_WINDOW_MS).toISOString() }, signal)
          const latest = records.reduce<BackendCollection | null>(
            (best, r) => (best === null || Date.parse(r.timestamp) >= Date.parse(best.timestamp) ? r : best),
            null,
          )
          entry = {
            metrics: latest ? mapCollectionToMetrics(latest) : null,
            at: latest?.timestamp ?? null,
            impact: records.length > 0 ? summarizeImpact(records) : null,
            fetchedAt: now,
          }
          cache.set(id, entry)
        } catch (error) {
          if (signal?.aborted) throw error
          failed = true
        }
      }

      if (!entry) return { ...snapshot, errorMessage: 'Não foi possível ler as métricas deste serviço' }
      return {
        ...snapshot,
        metrics: entry.metrics,
        metricsAt: entry.at,
        energyKwh: entry.impact?.energyKwh ?? null,
        co2eKg: entry.impact?.co2eKg ?? null,
        intensity: entry.impact?.intensity ?? null,
        intensityFallback: entry.impact?.intensityFallback ?? null,
        errorMessage: failed
          ? 'Métricas desatualizadas: a última consulta falhou'
          : entry.metrics
            ? null
            : 'Sem coleta de métricas nos últimos 15 minutos',
      }
    }),
  )
}
