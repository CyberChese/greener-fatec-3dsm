import { useCallback, useEffect, useRef, useState } from 'react'
import { aggregateSnapshots, REAL_INTERVAL_MS, SIMULATED_INTERVAL_MINUTES } from '@/lib/calculations'
import { IS_SIMULATED } from '@/lib/dataSource'
import { DEFAULT_POLLING_INTERVAL_MS } from '@/lib/settings'
import type {
  CarbonIntensity,
  CollectionRecord,
  EnvironmentEvent,
  SeriesPoint,
  ServiceSnapshot,
} from '@/lib/types'
import type { LatestMetricsCache } from '@/services/backend-services'
import { runBackendCollection, runCollection } from '@/services/collector'

const MAX_HISTORY = 1500
const MAX_SERIES = 60
const MAX_EVENTS = 12
export const METRICS_RETRY_MS = 15_000

export interface MetricsState {
  tick: number
  snapshots: ServiceSnapshot[]
  history: CollectionRecord[]
  series: SeriesPoint[]
  events: EnvironmentEvent[]
  lastUpdated: string | null
  simulatedNow: string | null
  aggregatorError: string | null
  carbonError: string | null
  /** true apenas até a primeira resposta (sucesso ou falha): único momento em que o skeleton aparece. */
  initialLoading: boolean
  /** true durante refetch em segundo plano: mantém os dados atuais na tela sem flicker. */
  refreshing: boolean
  /** true quando houve falha temporária: preserva os dados anteriores e tenta reconectar em intervalo controlado. */
  reconnecting: boolean
}

export const initialMetricsState: MetricsState = {
  tick: 0,
  snapshots: [],
  history: [],
  series: [],
  events: [],
  lastUpdated: null,
  simulatedNow: null,
  aggregatorError: null,
  carbonError: null,
  initialLoading: true,
  refreshing: false,
  reconnecting: false,
}

export const metricsRequested = (s: MetricsState): MetricsState =>
  s.initialLoading ? s : { ...s, refreshing: true }

function diffEvents(
  previous: ServiceSnapshot[],
  next: ServiceSnapshot[],
  simulatedAt: string,
  tick: number,
): EnvironmentEvent[] {
  if (previous.length === 0) return []
  const prevById = new Map(previous.map((s) => [s.id, s]))
  const nextIds = new Set(next.map((s) => s.id))
  const events: EnvironmentEvent[] = []
  const push = (kind: EnvironmentEvent['kind'], message: string) =>
    events.push({ id: `${tick}-${events.length}`, kind, message, simulatedAt })

  for (const s of next) {
    const before = prevById.get(s.id)
    if (!before) push('added', `${s.name} foi descoberto no registro`)
    else if (before.status !== 'active' && s.status === 'active') push('recovered', `${s.name} voltou a exportar métricas`)
    else if (before.status === 'active' && s.status === 'unavailable') push('down', `${s.name} não respondeu à coleta`)
    else if (before.status === 'active' && s.status === 'no_metrics') push('down', `${s.name} parou de exportar métricas`)
  }
  for (const s of previous) {
    if (!nextIds.has(s.id)) push('removed', `${s.name} saiu do registro de serviços`)
  }
  return events
}

/**
 * Coleta periódica de serviços e métricas alinhada ao intervalo configurado/API (padrão 30 s no modo real).
 * - Preserva dados anteriores durante refetch (sem skeleton nem perda de estado);
 * - Evita requisições sobrepostas (inFlight + agendamento por setTimeout pós-coleta);
 * - Em falha temporária, mantém os dados anteriores, sinaliza reconexão e tenta novamente em intervalo controlado;
 * - Cancela timers e requisições HTTP ativas (AbortController) ao desmontar ou pausar.
 */
export function useMetrics(intervalMs: number = IS_SIMULATED ? REAL_INTERVAL_MS : DEFAULT_POLLING_INTERVAL_MS) {
  const [state, setState] = useState<MetricsState>(initialMetricsState)
  const [paused, setPaused] = useState(false)
  const stateRef = useRef(state)
  const intensityCache = useRef(new Map<string, CarbonIntensity>())
  const metricsCache = useRef<LatestMetricsCache>(new Map())
  const simulatedStart = useRef<number | null>(null)
  const retryRef = useRef<() => void>(() => {})

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (paused) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let inFlight = false

    async function collect() {
      if (inFlight || disposed) return
      inFlight = true
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      controller = new AbortController()
      const currentController = controller
      setState(metricsRequested)

      let hadError = false
      try {
        const prev = stateRef.current
        const tick = prev.tick + 1
        simulatedStart.current ??= Date.now()
        const collectedAt = new Date().toISOString()
        // No modo real não há relógio acelerado: o horário da coleta é o horário de verdade.
        const simulatedAt = IS_SIMULATED
          ? new Date(simulatedStart.current + (tick - 1) * SIMULATED_INTERVAL_MINUTES * 60_000).toISOString()
          : collectedAt

        const result = IS_SIMULATED
          ? await runCollection(prev.snapshots, intensityCache.current)
          : await runBackendCollection(prev.snapshots, metricsCache.current, currentController.signal)

        if (disposed || currentController.signal.aborted) return

        hadError = Boolean(result.aggregatorError || result.carbonError)
        const aggregates = aggregateSnapshots(result.snapshots)

        const records: CollectionRecord[] = result.snapshots.map((s) => ({
          id: `${tick}-${s.id}`,
          tick,
          collectedAt,
          simulatedAt,
          serviceId: s.id,
          serviceName: s.name,
          regionCode: s.location.region_code,
          status: s.status,
          cpuPercent: s.metrics?.cpu_percent ?? null,
          memoryGb: s.metrics?.memory_gb ?? null,
          energyKwh: s.energyKwh,
          co2eKg: s.co2eKg,
        }))

        const point: SeriesPoint = {
          tick,
          label: new Date(simulatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          energyKwh: aggregates.totalEnergyKwh,
          co2eKg: aggregates.totalCo2eKg,
          active: aggregates.active,
          unavailable: aggregates.unavailable,
          noMetrics: aggregates.noMetrics,
        }

        const newEvents = diffEvents(prev.snapshots, result.snapshots, simulatedAt, tick)
        if (result.aggregatorError) {
          newEvents.push({ id: `${tick}-agg`, kind: 'api_error', message: result.aggregatorError, simulatedAt })
        }
        if (result.carbonError) {
          newEvents.push({ id: `${tick}-co2`, kind: 'api_error', message: result.carbonError, simulatedAt })
        }

        setState((current) => ({
          tick,
          snapshots: result.snapshots,
          history: result.aggregatorError ? current.history : [...current.history, ...records].slice(-MAX_HISTORY),
          series: result.aggregatorError ? current.series : [...current.series, point].slice(-MAX_SERIES),
          events: [...newEvents.reverse(), ...current.events].slice(0, MAX_EVENTS),
          lastUpdated: result.aggregatorError ? current.lastUpdated : collectedAt,
          simulatedNow: simulatedAt,
          aggregatorError: result.aggregatorError,
          carbonError: result.carbonError,
          initialLoading: false,
          refreshing: false,
          reconnecting: hadError,
        }))
      } catch (error) {
        if (disposed || currentController.signal.aborted) return
        hadError = true
        const message = error instanceof Error ? error.message : 'Falha ao consultar o backend'
        setState((current) => ({
          ...current,
          tick: current.tick + 1,
          aggregatorError: message,
          initialLoading: false,
          refreshing: false,
          reconnecting: true,
        }))
      } finally {
        inFlight = false
        if (!disposed && !currentController.signal.aborted) {
          const nextDelay = hadError ? Math.min(METRICS_RETRY_MS, intervalMs) : intervalMs
          timer = setTimeout(collect, nextDelay)
        }
      }
    }

    retryRef.current = () => void collect()
    const initialDelay = stateRef.current.tick === 0 ? 0 : intervalMs
    timer = setTimeout(collect, initialDelay)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      controller?.abort()
    }
  }, [paused, intervalMs])

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, history: [] }))
  }, [])

  const retry = useCallback(() => {
    retryRef.current()
  }, [])

  return { ...state, paused, setPaused, clearHistory, retry, intervalMs }
}

export type UseMetricsResult = ReturnType<typeof useMetrics>
