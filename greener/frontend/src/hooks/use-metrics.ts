import { useCallback, useEffect, useRef, useState } from 'react'
import { aggregateSnapshots, REAL_INTERVAL_MS, SIMULATED_INTERVAL_MINUTES } from '@/lib/calculations'
import type {
  CarbonIntensity,
  CollectionRecord,
  EnvironmentEvent,
  SeriesPoint,
  ServiceSnapshot,
} from '@/lib/types'
import { IS_SIMULATED } from '@/lib/dataSource'
import { runBackendCollection, runCollection } from '@/services/collector'

const MAX_HISTORY = 1500
const MAX_SERIES = 60
const MAX_EVENTS = 12

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
}

const initialState: MetricsState = {
  tick: 0,
  snapshots: [],
  history: [],
  series: [],
  events: [],
  lastUpdated: null,
  simulatedNow: null,
  aggregatorError: null,
  carbonError: null,
}

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

/** Coleta periódica: consulta o backend (ou a simulação) no intervalo configurado e acumula o histórico da sessão. */
export function useMetrics(intervalMs: number = REAL_INTERVAL_MS) {
  const [state, setState] = useState<MetricsState>(initialState)
  const [paused, setPaused] = useState(false)
  const stateRef = useRef(state)
  const inFlight = useRef(false)
  const intensityCache = useRef(new Map<string, CarbonIntensity>())
  const simulatedStart = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const collect = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
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
        : await runBackendCollection(prev.snapshots)
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
        history: [...current.history, ...records].slice(-MAX_HISTORY),
        series: [...current.series, point].slice(-MAX_SERIES),
        events: [...newEvents.reverse(), ...current.events].slice(0, MAX_EVENTS),
        lastUpdated: collectedAt,
        simulatedNow: simulatedAt,
        aggregatorError: result.aggregatorError,
        carbonError: result.carbonError,
      }))
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (paused) return
    if (stateRef.current.tick === 0) void collect()
    const id = setInterval(() => void collect(), intervalMs)
    return () => clearInterval(id)
  }, [paused, collect, intervalMs])

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, history: [] }))
  }, [])

  return { ...state, paused, setPaused, clearHistory, intervalMs }
}

export type UseMetricsResult = ReturnType<typeof useMetrics>
