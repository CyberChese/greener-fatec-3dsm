import type { PeriodTotals } from '@/lib/calculations'
import type { TimeRange } from '@/lib/dashboard-filters'
import type { RankingMetric } from '@/lib/types'
import { publicApi } from './http.ts'

const PAGE_LIMIT = 100
const MAX_PAGES = 20

interface RankingPage {
  items: { id: string; value: number }[]
  totalPages: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function parseRankingPage(value: unknown): RankingPage {
  const invalid = () => new Error('A API retornou um ranking inválido.')
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination)) throw invalid()

  const totalPages = toNumber(value.pagination.totalPages)
  if (totalPages === null || totalPages < 0) throw invalid()

  const items = value.items.map((item: unknown) => {
    if (!isRecord(item)) throw invalid()
    const id = item.external_id || item.service_id
    const metric = toNumber(item.metric_value)
    if (typeof id !== 'string' || id === '' || metric === null) throw invalid()
    return { id, value: metric }
  })

  return { items, totalPages }
}

export async function fetchRankingValues(
  metric: RankingMetric,
  range: TimeRange,
  signal?: AbortSignal,
): Promise<Map<string, number>> {
  const values = new Map<string, number>()
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= MAX_PAGES) {
    const { data } = await publicApi.get<unknown>('/metrics/ranking', {
      params: {
        metric,
        order: 'desc',
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
        page,
        limit: PAGE_LIMIT,
      },
      signal,
    })
    const parsed = parseRankingPage(data)
    for (const item of parsed.items) values.set(item.id, item.value)
    totalPages = parsed.totalPages
    page++
  }

  return values
}

export function combineTotals(energy: Map<string, number>, co2e: Map<string, number>): Map<string, PeriodTotals> {
  const totals = new Map<string, PeriodTotals>()
  for (const [id, energyKwh] of energy) {
    const co2eKg = co2e.get(id) ?? 0
    if (energyKwh <= 0 || co2eKg <= 0) continue
    totals.set(id, { energyKwh, co2eKg, samples: 0 })
  }
  return totals
}

export async function fetchPeriodTotals(range: TimeRange, signal?: AbortSignal): Promise<Map<string, PeriodTotals>> {
  const [energy, co2e] = await Promise.all([
    fetchRankingValues('energy', range, signal),
    fetchRankingValues('co2e', range, signal),
  ])
  return combineTotals(energy, co2e)
}

export function sumTotals(totals: Map<string, { energyKwh: number; co2eKg: number }>) {
  let energyKwh = 0
  let co2eKg = 0
  for (const item of totals.values()) {
    energyKwh += item.energyKwh
    co2eKg += item.co2eKg
  }
  return { energyKwh, co2eKg }
}
