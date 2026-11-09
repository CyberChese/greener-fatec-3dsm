import { aggregateSnapshots } from '@/lib/calculations'
import type { ServiceSnapshot } from '@/lib/types'
import { ApiError } from './apiError.ts'
import { fetchBackendServices, fetchServiceHistory, type BackendCollection } from './backend-services.ts'
import { publicApi } from './http.ts'
import { getCollectionStatus } from './metrics.ts'

/**
 * Resumo público consolidado do Observatório (TASK-024).
 *
 * Contrato real de GET /api/metrics/summary (TASK-023, `MetricsService.getSummary` no backend):
 * {
 *   "total_energy_kwh": 0.04692212,       // soma de energy_kwh de todas as coletas gravadas
 *   "total_co2e_kg": 0.01007074489,       // soma de co2e_kg de todas as coletas gravadas
 *   "services_count": { "active": 7, "unavailable": 1, "no_metrics": 0 }
 * }
 * O backend não envia o total de serviços nem o horário da última coleta: o total é a soma das três contagens
 * e o horário vem de GET /api/metrics/collection-config.
 *
 * `PublicSummary` abaixo é o formato interno usado pela tela (independente dos nomes do backend).
 */
export interface PublicSummary {
  energy_kwh: number
  co2e_kg: number
  services: {
    total: number
    active: number
    unavailable: number
    no_metrics: number
  }
  last_collection_at: string | null
  period: { from: string; to: string } | null
}

/** De onde veio o resumo exibido. */
export type SummarySource = 'api' | 'derived' | 'simulated'

export interface SummaryResult {
  summary: PublicSummary
  source: SummarySource
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isCount = (value: unknown): value is number => isNonNegative(value) && Number.isInteger(value)

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

/** Valores numéricos do PostgreSQL podem vir como texto; aceita os dois formatos. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Valida a resposta de GET /api/metrics/summary e a converte no formato interno.
 * `lastCollectionAt` vem de GET /api/metrics/collection-config (o resumo não traz esse dado).
 * Lança erro se o formato não bater com o contrato (nunca inventa zeros).
 */
export function parsePublicSummary(value: unknown, lastCollectionAt: string | null = null): PublicSummary {
  const invalid = () => new Error('A API retornou um resumo de indicadores inválido.')
  if (!isRecord(value) || !isRecord(value.services_count)) throw invalid()

  const energy = toNumber(value.total_energy_kwh)
  const co2e = toNumber(value.total_co2e_kg)
  const { active, unavailable, no_metrics } = value.services_count

  if (
    energy === null ||
    co2e === null ||
    !isNonNegative(energy) ||
    !isNonNegative(co2e) ||
    !isCount(active) ||
    !isCount(unavailable) ||
    !isCount(no_metrics)
  ) {
    throw invalid()
  }

  if (lastCollectionAt !== null && !isIsoDate(lastCollectionAt)) throw invalid()

  return {
    energy_kwh: energy,
    co2e_kg: co2e,
    services: { total: active + unavailable + no_metrics, active, unavailable, no_metrics },
    last_collection_at: lastCollectionAt,
    period: null,
  }
}

/** Janela usada quando o resumo precisa ser montado no navegador (backend sem o endpoint de resumo). */
export const DERIVED_WINDOW_MS = 60 * 60_000

/**
 * Plano B: monta o resumo a partir das rotas públicas de serviços e histórico, se o backend responder 404 no resumo.
 * Soma energy_kwh e co2e_g das coletas da janela; coletas sem esses valores são ignoradas (não viram zero).
 */
export function deriveSummary(
  services: ServiceSnapshot[],
  collections: BackendCollectionWithEnergy[],
  period: { from: string; to: string },
): PublicSummary {
  const counts = aggregateSnapshots(services)
  let energy = 0
  let co2eGrams = 0
  let last: number | null = null

  for (const c of collections) {
    const kwh = toNumber(c.energy_kwh)
    const grams = toNumber(c.co2e_g)
    if (kwh !== null) energy += kwh
    if (grams !== null) co2eGrams += grams
    const at = Date.parse(c.timestamp)
    if (!Number.isNaN(at) && (last === null || at > last)) last = at
  }

  return {
    energy_kwh: energy,
    co2e_kg: co2eGrams / 1000,
    services: {
      total: counts.total,
      active: counts.active,
      unavailable: counts.unavailable,
      no_metrics: counts.noMetrics,
    },
    last_collection_at: last === null ? null : new Date(last).toISOString(),
    period,
  }
}

/** Coleta do histórico incluindo as colunas de energia/emissão já gravadas pelo worker. */
export type BackendCollectionWithEnergy = BackendCollection & {
  energy_kwh?: string | number | null
  co2e_g?: string | number | null
}

async function fetchDerivedSummary(now = Date.now(), signal?: AbortSignal): Promise<PublicSummary> {
  const period = { from: new Date(now - DERIVED_WINDOW_MS).toISOString(), to: new Date(now).toISOString() }
  const services = await fetchBackendServices(signal)
  const histories = await Promise.all(
    services
      .filter((s) => s.backendId)
      .map((s) => fetchServiceHistory(s.backendId as string, { from: period.from }, signal) as Promise<BackendCollectionWithEnergy[]>),
  )
  return deriveSummary(services, histories.flat(), period)
}

/**
 * GET /api/metrics/summary (rota pública) + GET /api/metrics/collection-config (horário da última coleta).
 * Se o backend não tiver o endpoint de resumo (404), o resumo é montado com as rotas de serviços e histórico.
 */
export async function fetchPublicSummary(signal?: AbortSignal): Promise<SummaryResult> {
  try {
    const [{ data }, collection] = await Promise.all([
      publicApi.get<unknown>('/metrics/summary', { signal }),
      getCollectionStatus(signal),
    ])
    return { summary: parsePublicSummary(data, collection.last_collection_at), source: 'api' }
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof ApiError && error.status === 404) {
      return { summary: await fetchDerivedSummary(Date.now(), signal), source: 'derived' }
    }
    throw error
  }
}

/** Resumo no modo de demonstração (VITE_DATA_SOURCE=simulated), a partir da última coleta simulada. */
export function summaryFromSnapshots(snapshots: ServiceSnapshot[], lastCollectionAt: string | null): PublicSummary {
  const a = aggregateSnapshots(snapshots)
  return {
    energy_kwh: a.totalEnergyKwh,
    co2e_kg: a.totalCo2eKg,
    services: { total: a.total, active: a.active, unavailable: a.unavailable, no_metrics: a.noMetrics },
    last_collection_at: lastCollectionAt,
    period: null,
  }
}