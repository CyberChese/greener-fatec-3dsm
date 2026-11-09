import { useContext } from 'react'
import { MetricsContext } from '@/contexts/MetricsContext'
import type { UseMetricsResult } from '@/hooks/use-metrics'

export function useMetricsContext(): UseMetricsResult {
  const context = useContext(MetricsContext)
  if (!context) throw new Error('useMetricsContext deve ser usado dentro de <MetricsProvider>')
  return context
}
