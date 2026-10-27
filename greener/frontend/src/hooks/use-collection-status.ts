import { useEffect, useState } from 'react'
import { getCollectionStatus, type CollectionStatus } from '@/services/metrics'

export interface CollectionStatusState {
  status: CollectionStatus | null
  error: string | null
  loading: boolean
}

const RETRY_MS = 30_000

/**
 * Consulta o intervalo e a última coleta do worker do backend (GET /metrics/collection-config, task 015).
 * Repete a consulta no ritmo do próprio worker e tenta de novo em 30 s se falhar.
 */
export function useCollectionStatus(enabled = true): CollectionStatusState {
  const [state, setState] = useState<CollectionStatusState>({ status: null, error: null, loading: true })

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function refresh() {
      try {
        const status = await getCollectionStatus()
        if (disposed) return
        setState({ status, error: null, loading: false })
        timer = setTimeout(refresh, status.interval_seconds * 1000)
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : 'Não foi possível carregar o estado da coleta.'
        setState((previous) => ({ status: previous.status, error: message, loading: false }))
        timer = setTimeout(refresh, RETRY_MS)
      }
    }

    void refresh()
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled])

  return state
}
