import type { ReactNode } from 'react'
import { MetricsContext } from '@/contexts/MetricsContext'
import { useCollectionStatus } from '@/hooks/use-collection-status'
import { useMetrics } from '@/hooks/use-metrics'
import { useSettings } from '@/hooks/useSettings'
import { IS_SIMULATED } from '@/lib/dataSource'
import { DEFAULT_POLLING_INTERVAL_SECONDS } from '@/lib/settings'

// A coleta fica aqui, acima das rotas: trocar de tela não reinicia o histórico nem a série.
// No modo real, alinha o intervalo de polling ao interval_seconds informado pela API (padrão 30 s)
// ou à configuração personalizada salva pelo administrador.
export function MetricsProvider({ children }: { children: ReactNode }) {
  const { settings, hasCustomSettings } = useSettings()
  const { status: collectionStatus } = useCollectionStatus(!IS_SIMULATED)

  const effectiveIntervalSeconds = IS_SIMULATED
    ? settings.intervalSeconds
    : hasCustomSettings
      ? settings.intervalSeconds
      : (collectionStatus?.interval_seconds ?? DEFAULT_POLLING_INTERVAL_SECONDS)

  const metrics = useMetrics(effectiveIntervalSeconds * 1000)
  return <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
}
