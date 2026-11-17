import { useEffect, useState } from 'react'
import type { ServiceSnapshot } from '@/lib/types'
import {
  fetchServiceComparison,
  LATEST_WINDOW_MS,
  type BackendComparisonResult,
} from '@/services/backend-services'

const REFRESH_INTERVAL_MS = 10_000
const BUCKET_SECONDS = 30

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
export function useServiceComparison(services: ServiceSnapshot[], enabled: boolean): ServiceComparisonResult {
  const serviceIds = enabled
    ? [...new Set(services.map((service) => service.backendId ?? service.id))]
    : []
  const key = serviceIds.join('\u0000')
  const [state, setState] = useState<ComparisonState>({ key: '', result: null, error: null })

  useEffect(() => {
    const ids = key ? key.split('\u0000') : []
    if (ids.length < 2) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    async function load() {
      try {
        const result = await fetchServiceComparison(
          ids,
          {
            startDate: new Date(Date.now() - LATEST_WINDOW_MS).toISOString(),
            bucketSeconds: BUCKET_SECONDS,
          },
          controller.signal,
        )
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
  }, [key])

  const current = state.key === key
  return {
    result: current ? state.result : null,
    loading: serviceIds.length >= 2 && !current,
    error: current ? state.error : null,
  }
}
