/** Contratos espelhando a Greener Metrics Aggregator API e a Greener Carbon Intensity API. */

export interface ServiceLocation {
  region_code: string
  country: string
  region: string
  city: string | null
  latitude: number | null
  longitude: number | null
}

export interface ServiceSummary {
  id: string
  name: string
  location: ServiceLocation
  metrics_path: string
}

export interface Metrics {
  cpu_percent: number
  memory_gb: number
  disk_gb: number
  network_gb: number
}

export interface MetricsResponse {
  collection_interval_seconds: number
  metrics: Metrics | null
}

export interface CarbonIntensity {
  region_code: string
  country: string
  region: string
  city: string | null
  carbon_intensity_gco2e_per_kwh: number
  renewable_share_percent: number
}

/** Erro das APIs auxiliares simuladas (não confundir com o ApiError do cliente HTTP real em services/apiError.ts). */
export class SimulatedApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'SimulatedApiError'
    this.status = status
    this.code = code
  }
}

export type ServiceStatus = 'active' | 'unavailable' | 'no_metrics'

export interface ServiceSnapshot {
  id: string
  name: string
  location: ServiceLocation
  status: ServiceStatus
  metrics: Metrics | null
  intensity: number | null
  renewableShare: number | null
  powerWatts: number | null
  energyKwh: number | null
  co2eKg: number | null
  errorMessage: string | null
  /** Id interno (UUID) do serviço no backend; usado nas rotas /services/:id/history. */
  backendId?: string
  /** Instante da coleta de onde vieram as métricas (modo real). */
  metricsAt?: string | null
}

export interface CollectionRecord {
  id: string
  tick: number
  collectedAt: string
  simulatedAt: string
  serviceId: string
  serviceName: string
  regionCode: string
  status: ServiceStatus
  cpuPercent: number | null
  memoryGb: number | null
  energyKwh: number | null
  co2eKg: number | null
}

export interface SeriesPoint {
  tick: number
  label: string
  energyKwh: number
  co2eKg: number
  active: number
  unavailable: number
  noMetrics: number
}

export type EnvironmentEventKind = 'added' | 'removed' | 'recovered' | 'down' | 'api_error'

export interface EnvironmentEvent {
  id: string
  kind: EnvironmentEventKind
  message: string
  simulatedAt: string
}

export interface Aggregates {
  totalEnergyKwh: number
  totalCo2eKg: number
  avgIntensity: number | null
  active: number
  unavailable: number
  noMetrics: number
  total: number
}

export type Period = 'last10' | 'session'

export type RankingMetric = 'energy' | 'co2e'

export interface QueryPoint {
  latitude: number | null
  longitude: number | null
  radiusKm: number
}

export interface DashboardFilters {
  search: string
  status: ServiceStatus | 'all'
  point: QueryPoint
}
