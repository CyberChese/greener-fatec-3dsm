import type {
  Aggregates,
  CollectionRecord,
  Metrics,
  ServiceSnapshot,
  ServiceStatus,
} from './types'

/** Cada coleta real de 3 s representa 15 min de operação simulada. */
export const REAL_INTERVAL_MS = 3000
export const SIMULATED_INTERVAL_MINUTES = 15
export const SIMULATED_INTERVAL_HOURS = SIMULATED_INTERVAL_MINUTES / 60

/**
 * Modelo de potência do projeto (slide do cliente):
 * W = CPU%/100 × CPU_MAX_WATTS + RAM(GB) × 0,375 + DISCO(GB) × 0,01 + REDE(GB) × 0,02.
 * Na versão final este cálculo roda no backend (worker); aqui ele só alimenta a simulação.
 */
export const CPU_MAX_WATTS = 100
export const WATTS_PER_MEMORY_GB = 0.375
export const WATTS_PER_DISK_GB = 0.01
export const WATTS_PER_NETWORK_GB = 0.02

export function estimatePowerWatts(metrics: Metrics): number {
  return (
    (metrics.cpu_percent / 100) * CPU_MAX_WATTS +
    WATTS_PER_MEMORY_GB * metrics.memory_gb +
    WATTS_PER_DISK_GB * metrics.disk_gb +
    WATTS_PER_NETWORK_GB * metrics.network_gb
  )
}

/** kWh = W × horas ÷ 1000. */
export function estimateEnergyKwh(metrics: Metrics, hours = SIMULATED_INTERVAL_HOURS): number {
  return (estimatePowerWatts(metrics) * hours) / 1000
}

export function estimateCo2eKg(energyKwh: number, intensityGPerKwh: number): number {
  return (energyKwh * intensityGPerKwh) / 1000
}

export function hasCompleteMetrics(metrics: Metrics | null | undefined): metrics is Metrics {
  if (!metrics) return false
  return [metrics.cpu_percent, metrics.memory_gb, metrics.disk_gb, metrics.network_gb].every(
    (value) => typeof value === 'number' && Number.isFinite(value),
  )
}

/** Regra de classificação: falha de requisição → indisponível; resposta sem métricas → sem métricas. */
export function classifyStatus(requestFailed: boolean, metrics: Metrics | null | undefined): ServiceStatus {
  if (requestFailed) return 'unavailable'
  return hasCompleteMetrics(metrics) ? 'active' : 'no_metrics'
}

export function aggregateSnapshots(snapshots: ServiceSnapshot[]): Aggregates {
  let totalEnergyKwh = 0
  let totalCo2eKg = 0
  let active = 0
  let unavailable = 0
  let noMetrics = 0

  for (const s of snapshots) {
    if (s.status === 'active') active++
    else if (s.status === 'unavailable') unavailable++
    else noMetrics++
    totalEnergyKwh += s.energyKwh ?? 0
    totalCo2eKg += s.co2eKg ?? 0
  }

  return {
    totalEnergyKwh,
    totalCo2eKg,
    avgIntensity: totalEnergyKwh > 0 ? (totalCo2eKg * 1000) / totalEnergyKwh : null,
    active,
    unavailable,
    noMetrics,
    total: snapshots.length,
  }
}

export interface PeriodTotals {
  energyKwh: number
  co2eKg: number
  samples: number
}

/** Soma energia e CO₂e por serviço dentro das coletas do período escolhido. */
export function totalsByService(records: CollectionRecord[], fromTick: number): Map<string, PeriodTotals> {
  const totals = new Map<string, PeriodTotals>()
  for (const r of records) {
    if (r.tick < fromTick) continue
    const current = totals.get(r.serviceId) ?? { energyKwh: 0, co2eKg: 0, samples: 0 }
    current.energyKwh += r.energyKwh ?? 0
    current.co2eKg += r.co2eKg ?? 0
    if (r.status === 'active') current.samples++
    totals.set(r.serviceId, current)
  }
  return totals
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}
