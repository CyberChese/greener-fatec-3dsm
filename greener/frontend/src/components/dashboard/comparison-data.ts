import type { CollectionRecord, ServiceSnapshot } from '@/lib/types'
import type { BackendComparisonResult, BackendComparisonSeriesPoint } from '@/services/backend-services'

export const MAX_COMPARED_SERVICES = 4

export const COMPARISON_COLORS = ['#a3e635', '#38bdf8', '#fb7185', '#c084fc'] as const

export function toggleComparisonSelection(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) return selectedIds.filter((selectedId) => selectedId !== id)
  return selectedIds.length < MAX_COMPARED_SERVICES ? [...selectedIds, id] : selectedIds
}

export interface ComparisonValues {
  energyKwh: number | null
  co2eKg: number | null
}

export interface ComparisonPoint {
  timestamp: number
  values: Record<string, ComparisonValues>
}

export interface ImpactComparison {
  mostEfficient: ServiceSnapshot
  leastEfficient: ServiceSnapshot
  mostEfficientKg: number
  leastEfficientKg: number
  mostEfficientSamples: number
  leastEfficientSamples: number
  savingsPercent: number
}

function finiteNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function addPoint(
  points: Map<number, ComparisonPoint>,
  timestamp: string,
  serviceId: string,
  energyKwh: number | null,
  co2eKg: number | null,
) {
  const parsedTimestamp = Date.parse(timestamp)
  if (!Number.isFinite(parsedTimestamp) || (energyKwh == null && co2eKg == null)) return

  const point = points.get(parsedTimestamp) ?? { timestamp: parsedTimestamp, values: {} }
  point.values[serviceId] = { energyKwh, co2eKg }
  points.set(parsedTimestamp, point)
}

/** Agrupa as coletas reais ou simuladas por instante sem transformar valores ausentes em zero. */
export function buildComparisonPoints(
  services: ServiceSnapshot[],
  simulatedHistory: CollectionRecord[],
  realHistory: BackendComparisonSeriesPoint[],
): ComparisonPoint[] {
  const serviceIds = new Set(services.map((service) => service.id))
  const points = new Map<number, ComparisonPoint>()

  for (const record of simulatedHistory) {
    if (!serviceIds.has(record.serviceId)) continue
    addPoint(points, record.simulatedAt, record.serviceId, record.energyKwh, record.co2eKg)
  }

  for (const record of realHistory) {
    for (const service of services) {
      const values = record.values[service.backendId ?? service.id]
      if (!values) continue
      addPoint(
        points,
        record.timestamp,
        service.id,
        finiteNumber(values.energy_kwh),
        finiteNumber(values.co2e_kg),
      )
    }
  }

  return [...points.values()].sort((left, right) => left.timestamp - right.timestamp)
}

/** Compara as emissões observadas no período; serviços sem medição ficam fora do cálculo. */
export function summarizeImpactComparison(
  services: ServiceSnapshot[],
  points: ComparisonPoint[],
): ImpactComparison | null {
  const totals = new Map<string, { co2eKg: number; samples: number }>()

  for (const point of points) {
    for (const [serviceId, values] of Object.entries(point.values)) {
      if (values.co2eKg == null || !Number.isFinite(values.co2eKg)) continue
      const total = totals.get(serviceId) ?? { co2eKg: 0, samples: 0 }
      total.co2eKg += values.co2eKg
      total.samples++
      totals.set(serviceId, total)
    }
  }

  const measured = services.flatMap((service) => {
    const total = totals.get(service.id)
    return total ? [{ service, ...total }] : []
  })
  if (measured.length < 2) return null

  const mostEfficient = measured.reduce((best, current) => (current.co2eKg < best.co2eKg ? current : best))
  const leastEfficient = measured.reduce((worst, current) => (current.co2eKg > worst.co2eKg ? current : worst))
  const savingsPercent =
    leastEfficient.co2eKg > 0
      ? ((leastEfficient.co2eKg - mostEfficient.co2eKg) / leastEfficient.co2eKg) * 100
      : 0

  return {
    mostEfficient: mostEfficient.service,
    leastEfficient: leastEfficient.service,
    mostEfficientKg: mostEfficient.co2eKg,
    leastEfficientKg: leastEfficient.co2eKg,
    mostEfficientSamples: mostEfficient.samples,
    leastEfficientSamples: leastEfficient.samples,
    savingsPercent,
  }
}

/** Usa o resumo do endpoint real, validando que ambos os serviços têm emissões medidas no período. */
export function summarizeBackendImpactComparison(
  services: ServiceSnapshot[],
  result: BackendComparisonResult,
): ImpactComparison | null {
  const { most_polluting_service_id: leastEfficientId, least_polluting_service_id: mostEfficientId } = result.summary
  const savingsPercent = result.summary.efficiency_difference_percent
  if (!leastEfficientId || !mostEfficientId || savingsPercent == null || leastEfficientId === mostEfficientId) return null

  const mostEfficient = services.find((service) => (service.backendId ?? service.id) === mostEfficientId)
  const leastEfficient = services.find((service) => (service.backendId ?? service.id) === leastEfficientId)
  const mostEfficientSummary = result.services.find((service) => service.service_id === mostEfficientId)
  const leastEfficientSummary = result.services.find((service) => service.service_id === leastEfficientId)
  if (!mostEfficient || !leastEfficient || !mostEfficientSummary || !leastEfficientSummary) return null

  const sampleCount = (serviceId: string) =>
    result.series.filter((point) => point.values[serviceId]?.co2e_kg != null).length
  const mostEfficientSamples = sampleCount(mostEfficientId)
  const leastEfficientSamples = sampleCount(leastEfficientId)
  if (mostEfficientSamples === 0 || leastEfficientSamples === 0) return null

  return {
    mostEfficient,
    leastEfficient,
    mostEfficientKg: mostEfficientSummary.total_co2e_kg,
    leastEfficientKg: leastEfficientSummary.total_co2e_kg,
    mostEfficientSamples,
    leastEfficientSamples,
    savingsPercent,
  }
}
