import { useEffect, useState } from 'react'
import { rangeKey, resolveRange, type TimeFilters } from '@/lib/dashboard-filters'
import type { ServiceSnapshot } from '@/lib/types'
import {
  fetchServiceComparison,
  LATEST_WINDOW_MS,
  type BackendComparisonResult,
} from '@/services/backend-services'

const REFRESH_INTERVAL_MS = 10_000
const BUCKET_SECONDS = 30
const MAX_POINTS = 120

export function comparisonWindow(filters: TimeFilters | undefined, now: number) {
  if (!filters) {
    return { startDate: new Date(now - LATEST_WINDOW_MS).toISOString(), bucketSeconds: BUCKET_SECONDS }
  }
  const range = resolveRange(filters, now)
  const seconds = (range.to.getTime() - range.from.getTime()) / 1000
  return {
    startDate: range.from.toISOString(),
    endDate: range.to.toISOString(),
    bucketSeconds: Math.min(86_400, Math.max(BUCKET_SECONDS, Math.ceil(seconds / MAX_POINTS))),
  }
}

interface ComparisonState {
  key: string
  result: BackendComparisonResult | null
  error: string | null
}

export interface ServiceComparisonResult {
  result: BackendComparisonResult | null
  loading: boolean
  error: string | null
}

/** Atualiza em conjunto a comparação real para que os timestamps já venham alinhados pelo backend. */
export function useServiceComparison(
  services: ServiceSnapshot[],
  enabled: boolean,
  filters?: TimeFilters,
): ServiceComparisonResult {
  const serviceIds = enabled
    ? [...new Set(services.map((service) => service.backendId ?? service.id))]
    : []
  const windowKey = filters ? rangeKey(filters) : ''
  const key = serviceIds.length > 0 ? `${windowKey}\u0001${serviceIds.join('\u0000')}` : ''
  const preset = filters?.preset
  const from = filters?.from ?? null
  const to = filters?.to ?? null
  const [state, setState] = useState<ComparisonState>({ key: '', result: null, error: null })

  useEffect(() => {
    const ids = key ? key.split('\u0001')[1].split('\u0000') : []
    const windowFilters = preset ? { preset, from, to, search: '' } : undefined
    if (ids.length < 2) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    async function load() {
      try {
        const result = await fetchServiceComparison(ids, comparisonWindow(windowFilters, Date.now()), controller.signal)
        if (disposed) return
        setState({ key, result, error: null })
      } catch (reason) {
        if (disposed || controller.signal.aborted) return
        const message = reason instanceof Error ? reason.message : 'Falha ao carregar a comparação dos serviços.'
        setState((previous) => ({
          key,
          result: previous.key === key ? previous.result : null,
          error: message,
        }))
      }
      if (!disposed) timer = setTimeout(() => void load(), REFRESH_INTERVAL_MS)
    }

    void load()
    return () => {
      disposed = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [key, preset, from, to])

  const current = state.key === key
  return {
    result: current ? state.result : null,
    loading: serviceIds.length >= 2 && !current,
    error: current ? state.error : null,
  }
}
