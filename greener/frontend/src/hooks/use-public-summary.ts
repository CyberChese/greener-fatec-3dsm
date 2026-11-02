import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPublicSummary, type SummaryResult } from '@/services/summary'

export interface PublicSummaryState {
  /** Último resumo recebido com sucesso. Nunca é apagado por um erro posterior. */
  data: SummaryResult | null
  /** Horário (ISO) em que `data` chegou. */
  updatedAt: string | null
  /** Mensagem da última falha; volta a null no próximo sucesso. */
  error: string | null
  /** true só até a primeira resposta (sucesso ou erro): é o único momento em que o skeleton aparece. */
  initialLoading: boolean
  /** Atualização em segundo plano: os valores atuais continuam na tela. */
  refreshing: boolean
}

export const initialSummaryState: PublicSummaryState = {
  data: null,
  updatedAt: null,
  error: null,
  initialLoading: true,
  refreshing: false,
}

/* Transições puras (testáveis sem React). */
export const summaryRequested = (s: PublicSummaryState): PublicSummaryState =>
  s.initialLoading ? s : { ...s, refreshing: true }

export const summaryLoaded = (s: PublicSummaryState, data: SummaryResult, at: string): PublicSummaryState => ({
  ...s,
  data,
  updatedAt: at,
  error: null,
  initialLoading: false,
  refreshing: false,
})

export const summaryFailed = (s: PublicSummaryState, message: string): PublicSummaryState => ({
  ...s, // mantém data/updatedAt: os valores anteriores continuam visíveis
  error: message,
  initialLoading: false,
  refreshing: false,
})

const RETRY_MS = 15_000

interface Options {
  intervalMs: number
  enabled?: boolean
  load?: () => Promise<SummaryResult>
}

/**
 * Consulta o resumo público periodicamente.
 * - skeleton apenas no primeiro carregamento;
 * - atualizações seguintes substituem os valores sem limpar a tela;
 * - erro de rede mantém os dados anteriores e tenta de novo em 15 s.
 */
export function usePublicSummary({ intervalMs, enabled = true, load = fetchPublicSummary }: Options) {
  const [state, setState] = useState<PublicSummaryState>(initialSummaryState)
  const loadRef = useRef(load)
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let inFlight = false

    async function refresh() {
      if (inFlight) return
      inFlight = true
      if (timer) clearTimeout(timer)
      setState(summaryRequested)
      try {
        const result = await loadRef.current()
        if (disposed) return
        setState((s) => summaryLoaded(s, result, new Date().toISOString()))
        timer = setTimeout(refresh, intervalMs)
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os indicadores.'
        setState((s) => summaryFailed(s, message))
        timer = setTimeout(refresh, Math.min(RETRY_MS, intervalMs))
      } finally {
        inFlight = false
      }
    }

    refreshRef.current = () => void refresh()
    // Primeira consulta logo em seguida (fora do corpo do efeito, como pede o lint de hooks).
    timer = setTimeout(refresh, 0)
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, intervalMs])

  const retry = useCallback(() => refreshRef.current(), [])

  return { ...state, retry }
}