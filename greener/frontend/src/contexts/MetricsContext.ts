import { createContext } from 'react'
import type { UseMetricsResult } from '@/hooks/use-metrics'

export const MetricsContext = createContext<UseMetricsResult | null>(null)
