import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  DEFAULT_FILTERS,
  parseTimeFilters,
  writeTimeFilters,
  type QuickPreset,
  type TimeFilters,
} from '@/lib/dashboard-filters'

export function useDashboardFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseTimeFilters(params), [params])

  const commit = useCallback(
    (patch: Partial<TimeFilters>, replace = false) => {
      setParams((current) => writeTimeFilters(current, { ...parseTimeFilters(current), ...patch }), { replace })
    },
    [setParams],
  )

  const setPreset = useCallback((preset: QuickPreset) => commit({ preset, from: null, to: null }), [commit])
  const applyCustomRange = useCallback(
    (from: string, to: string) => commit({ preset: 'custom', from, to }),
    [commit],
  )
  const setSearch = useCallback((search: string) => commit({ search }, true), [commit])
  const clear = useCallback(() => commit(DEFAULT_FILTERS), [commit])

  return { filters, setPreset, applyCustomRange, setSearch, clear }
}

export type DashboardFiltersControls = ReturnType<typeof useDashboardFilters>
