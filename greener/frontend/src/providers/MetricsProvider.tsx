import type { ReactNode } from 'react'
import { MetricsContext } from '@/contexts/MetricsContext'
import { useMetrics } from '@/hooks/use-metrics'
import { useSettings } from '@/hooks/useSettings'

// A coleta fica aqui, acima das rotas: trocar de tela não reinicia o histórico nem a série.
export function MetricsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const metrics = useMetrics(settings.intervalSeconds * 1000)
  return <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
}
