import { useEffect, useState } from 'react'
import type { PeriodTotals } from '@/lib/calculations'
import { rangeKey, resolveRange, type TimeFilters } from '@/lib/dashboard-filters'
import { fetchPeriodTotals } from '@/services/ranking'

interface PeriodTotalsState {
  key: string | null
  totals: Map<string, PeriodTotals> | null
  range: { from: string; to: string } | null
  error: string | null
}

const initialState: PeriodTotalsState = { key: null, totals: null, range: null, error: null }

export function usePeriodTotals(
  filters: TimeFilters,
  refreshToken: string | number | null,
  enabled = true,
  load: typeof fetchPeriodTotals = fetchPeriodTotals,
) {
  const [state, setState] = useState<PeriodTotalsState>(initialState)
  const key = rangeKey(filters)
  const { preset, from, to } = filters

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const range = resolveRange({ preset, from, to, search: '' }, Date.now())

    load(range, controller.signal).then(
      (totals) => {
        if (controller.signal.aborted) return
        setState({
          key,
          totals,
          range: { from: range.from.toISOString(), to: range.to.toISOString() },
          error: null,
        })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Não foi possível carregar o período selecionado.'
        setState((previous) => ({
          key,
          totals: previous.key === key ? previous.totals : null,
          range: previous.key === key ? previous.range : null,
          error: message,
        }))
      },
    )

    return () => controller.abort()
  }, [enabled, key, preset, from, to, refreshToken, load])

  const current = state.key === key
  return {
    totals: state.totals,
    range: state.range,
    error: current ? state.error : null,
    loading: enabled && !current,
  }
}
