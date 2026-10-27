import { DashboardView } from '@/components/dashboard/dashboard-view'
import { useMetricsContext } from '@/hooks/useMetricsContext'

// Consulta pública: o observatório não exige login.
export function HomePage() {
  const metrics = useMetricsContext()
  return <DashboardView metrics={metrics} />
}
