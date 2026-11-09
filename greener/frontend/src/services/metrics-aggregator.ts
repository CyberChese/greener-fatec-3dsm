import { SimulatedApiError, type MetricsResponse, type ServiceSummary } from '@/lib/types'

/**
 * Simulação client-side da Greener Metrics Aggregator API (https://metrics.unilaunch.org).
 * As funções mantêm o mesmo contrato dos endpoints reais para que a troca por `fetch` seja direta.
 */

type Health = 'available' | 'unavailable' | 'metrics_missing'

interface SimulatedService {
  summary: ServiceSummary
  health: Health
  baseCpu: number
  baseMemoryGb: number
  baseDiskGb: number
  listed: boolean
  optional: boolean
}

const service = (
  id: string,
  name: string,
  region_code: string,
  country: string,
  region: string,
  city: string | null,
  latitude: number | null,
  longitude: number | null,
  baseCpu: number,
  baseMemoryGb: number,
  optional = false,
): SimulatedService => ({
  summary: {
    id,
    name,
    location: { region_code, country, region, city, latitude, longitude },
    metrics_path: `/metrics/${id}`,
  },
  health: 'available',
  baseCpu,
  baseMemoryGb,
  baseDiskGb: 10 + baseMemoryGb * 4,
  listed: !optional,
  optional,
})

const registry: SimulatedService[] = [
  service('billing-api', 'Billing API', 'br-sudeste', 'Brazil', 'Sudeste', 'São Paulo', -23.5505, -46.6333, 55, 3.2),
  service('auth-api', 'Auth API', 'us-east', 'United States of America', 'Virginia', 'Ashburn', 39.0438, -77.4874, 38, 2.1),
  service('search-api', 'Search API', 'eu-west', 'Ireland', 'Leinster', 'Dublin', 53.3498, -6.2603, 64, 6.4),
  service('payments-api', 'Payments API', 'ca-central', 'Canada', 'Quebec', 'Montreal', 45.5017, -73.5673, 42, 2.8),
  service('notifications', 'Notifications', 'jp-east', 'Japan', 'Kanto', 'Tokyo', 35.6762, 139.6503, 30, 1.6),
  service('reports-worker', 'Reports Worker', 'br-sudeste', 'Brazil', 'Sudeste', null, null, null, 70, 8.0),
  service('api-gateway', 'API Gateway', 'us-east', 'United States of America', 'Virginia', 'Ashburn', 39.0438, -77.4874, 48, 4.2),
  service('analytics', 'Analytics', 'eu-central', 'Germany', 'Hesse', 'Frankfurt', 50.1109, 8.6821, 58, 12.0),
  service('ml-inference', 'ML Inference', 'ap-south', 'India', 'Maharashtra', 'Mumbai', 19.076, 72.8777, 76, 16.0, true),
  service('media-cdn', 'Media CDN', 'au-east', 'Australia', 'New South Wales', 'Sydney', -33.8688, 151.2093, 34, 3.0, true),
]

const NETWORK_LATENCY_MS = { min: 40, max: 180 }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const latency = () => wait(NETWORK_LATENCY_MS.min + Math.random() * (NETWORK_LATENCY_MS.max - NETWORK_LATENCY_MS.min))
const jitter = (base: number, spread: number) => Math.max(0, base + (Math.random() - 0.5) * 2 * spread)

/** Transições de saúde com memória: estados tendem a persistir por algumas coletas. */
function evolveHealth(current: Health): Health {
  const roll = Math.random()
  if (current === 'available') {
    if (roll < 0.07) return 'unavailable'
    if (roll < 0.13) return 'metrics_missing'
    return 'available'
  }
  return roll < 0.45 ? 'available' : current
}

/** Avança o ambiente simulado: serviços mudam de estado, entram e saem do registro. */
export function advanceSimulatedEnvironment() {
  for (const s of registry) {
    s.health = evolveHealth(s.health)
    if (s.optional && Math.random() < 0.08) {
      s.listed = !s.listed
      if (s.listed) s.health = 'available'
    }
  }
}

/** GET /services */
export async function listServices(): Promise<ServiceSummary[]> {
  await latency()
  if (Math.random() < 0.02) {
    throw new SimulatedApiError(503, 'aggregator_unavailable', 'Agregador de Métricas não respondeu')
  }
  return registry.filter((s) => s.listed).map((s) => structuredClone(s.summary))
}

/** GET /metrics/{service_id} */
export async function getServiceMetrics(serviceId: string): Promise<MetricsResponse> {
  await latency()
  const entry = registry.find((s) => s.summary.id === serviceId && s.listed)
  if (!entry) throw new SimulatedApiError(404, 'service_not_found', `service '${serviceId}' is not listed`)

  if (entry.health === 'unavailable') {
    throw new SimulatedApiError(500, 'service_unavailable', `service '${serviceId}' is listed but currently unavailable`)
  }

  if (entry.health === 'metrics_missing') {
    return { collection_interval_seconds: 27, metrics: null }
  }

  return {
    collection_interval_seconds: 27,
    metrics: {
      cpu_percent: Math.min(100, jitter(entry.baseCpu, 18)),
      memory_gb: jitter(entry.baseMemoryGb, entry.baseMemoryGb * 0.2),
      disk_gb: jitter(entry.baseDiskGb, 2),
      network_gb: jitter(0.35, 0.3),
    },
  }
}
