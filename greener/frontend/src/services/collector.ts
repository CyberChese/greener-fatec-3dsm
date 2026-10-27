import { classifyStatus, estimateCo2eKg, estimateEnergyKwh, estimatePowerWatts } from '@/lib/calculations'
import type { CarbonIntensity, ServiceSnapshot, ServiceSummary } from '@/lib/types'
import { getCarbonIntensity } from './carbon-intensity'
import { fetchBackendServices } from './backend-services'
import { advanceSimulatedEnvironment, getServiceMetrics, listServices } from './metrics-aggregator'

export interface CollectionResult {
  snapshots: ServiceSnapshot[]
  aggregatorError: string | null
  carbonError: string | null
}

const errorMessage = (reason: unknown) => (reason instanceof Error ? reason.message : 'Falha desconhecida')

/**
 * Executa uma rodada de coleta: descobre serviços (RF01), coleta métricas (RF03),
 * busca intensidade de carbono e calcula energia/CO₂e (RF07).
 * Falhas de uma API auxiliar não interrompem a rodada (RNF05).
 */
export async function runCollection(
  previous: ServiceSnapshot[],
  intensityCache: Map<string, CarbonIntensity>,
): Promise<CollectionResult> {
  advanceSimulatedEnvironment()

  let services: ServiceSummary[]
  let aggregatorError: string | null = null
  try {
    services = await listServices()
  } catch (reason) {
    aggregatorError = errorMessage(reason)
    services = previous.map((s) => ({ id: s.id, name: s.name, location: s.location, metrics_path: `/metrics/${s.id}` }))
  }

  const regionCodes = [...new Set(services.map((s) => s.location.region_code))]
  const intensityResults = await Promise.allSettled(regionCodes.map((code) => getCarbonIntensity(code)))
  let carbonError: string | null = null
  intensityResults.forEach((result, index) => {
    if (result.status === 'fulfilled') intensityCache.set(regionCodes[index], result.value)
    else carbonError = errorMessage(result.reason)
  })

  const metricResults = aggregatorError
    ? services.map(() => ({ status: 'rejected' as const, reason: new Error(aggregatorError ?? '') }))
    : await Promise.allSettled(services.map((s) => getServiceMetrics(s.id)))

  const snapshots = services.map<ServiceSnapshot>((summary, index) => {
    const result = metricResults[index]
    const failed = result.status === 'rejected'
    const metrics = result.status === 'fulfilled' ? result.value.metrics : null
    const status = classifyStatus(failed, metrics)
    const carbon = intensityCache.get(summary.location.region_code) ?? null
    const intensity = carbon?.carbon_intensity_gco2e_per_kwh ?? null

    const energyKwh = status === 'active' && metrics ? estimateEnergyKwh(metrics) : null
    const co2eKg = energyKwh != null && intensity != null ? estimateCo2eKg(energyKwh, intensity) : null

    return {
      id: summary.id,
      name: summary.name,
      location: summary.location,
      status,
      metrics: status === 'active' ? metrics : null,
      intensity,
      renewableShare: carbon?.renewable_share_percent ?? null,
      powerWatts: status === 'active' && metrics ? estimatePowerWatts(metrics) : null,
      energyKwh,
      co2eKg,
      errorMessage: failed ? errorMessage(result.reason) : status === 'no_metrics' ? 'Listado, mas sem exportar métricas' : null,
    }
  })

  return { snapshots, aggregatorError, carbonError }
}

/** Coleta no modo real: lê os serviços do backend. Se falhar, mantém os últimos dados conhecidos. */
export async function runBackendCollection(previous: ServiceSnapshot[]): Promise<CollectionResult> {
  try {
    return { snapshots: await fetchBackendServices(), aggregatorError: null, carbonError: null }
  } catch (reason) {
    return {
      snapshots: previous,
      aggregatorError: reason instanceof Error ? reason.message : 'Falha ao consultar o backend',
      carbonError: null,
    }
  }
}
