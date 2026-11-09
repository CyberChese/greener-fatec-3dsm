import { useEffect, useState } from 'react'
import { fetchServiceHistory, type BackendCollection } from '@/services/backend-services'

interface HistoryState {
  key: string | null
  records: BackendCollection[]
  error: string | null
}

export interface ServiceHistoryResult {
  records: BackendCollection[]
  error: string | null
  loading: boolean
}

/** Histórico real de um serviço (GET /services/:id/history) no período pedido, atualizado a cada refreshMs. */
export function useServiceHistory(backendId: string | null, rangeMs: number, refreshMs = 10_000): ServiceHistoryResult {
  const [state, setState] = useState<HistoryState>({ key: null, records: [], error: null })
  const key = backendId ? `${backendId}:${rangeMs}` : null

  useEffect(() => {
    if (!key || !backendId) return
    let disposed = false

    async function load() {
      try {
        const records = await fetchServiceHistory(backendId as string, { from: new Date(Date.now() - rangeMs).toISOString() })
        if (!disposed) setState({ key, records, error: null })
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : 'Não foi possível carregar o histórico.'
        setState((previous) => ({ key, records: previous.key === key ? previous.records : [], error: message }))
      }
    }

    void load()
    const id = setInterval(() => void load(), refreshMs)
    return () => {
      disposed = true
      clearInterval(id)
    }
  }, [key, backendId, rangeMs, refreshMs])

  const current = state.key === key
  return { records: current ? state.records : [], error: current ? state.error : null, loading: key !== null && !current }
}
