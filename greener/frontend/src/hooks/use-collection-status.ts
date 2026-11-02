import { useEffect, useState } from 'react'
import { getCollectionStatus, type CollectionStatus } from '@/services/metrics'

export interface CollectionStatusState {
  status: CollectionStatus | null
  error: string | null
  loading: boolean
}

const RETRY_MS = 15_000

/**
 * Consulta o intervalo e a última coleta do worker do backend (GET /metrics/collection-config, task 015).
 * Repete a consulta no ritmo do próprio worker, preserva dados em falha e cancela timer/requisição ao desmontar.
 */
export function useCollectionStatus(enabled = true): CollectionStatusState {
  const [state, setState] = useState<CollectionStatusState>({ status: null, error: null, loading: true })

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let inFlight = false

    async function refresh() {
      if (inFlight || disposed) return
      inFlight = true
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      controller = new AbortController()
      const currentController = controller
      try {
        const status = await getCollectionStatus(currentController.signal)
        if (disposed || currentController.signal.aborted) return
        setState({ status, error: null, loading: false })
        timer = setTimeout(refresh, status.interval_seconds * 1000)
      } catch (error) {
        if (disposed || currentController.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Não foi possível carregar o estado da coleta.'
        setState((previous) => ({ status: previous.status, error: message, loading: false }))
        timer = setTimeout(refresh, RETRY_MS)
      } finally {
        inFlight = false
      }
    }

    timer = setTimeout(refresh, 0)
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      controller?.abort()
    }
  }, [enabled])

  return state
}
