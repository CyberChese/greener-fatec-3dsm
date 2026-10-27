import { Outlet } from 'react-router'
import { IS_SIMULATED } from '@/lib/dataSource'
import { useMetricsContext } from '@/hooks/useMetricsContext'
import { AppHeader } from './dashboard/app-header.tsx'

export function AppLayout() {
  const metrics = useMetricsContext()

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(163,230,53,0.08),transparent),radial-gradient(ellipse_60%_40%_at_100%_10%,rgba(167,139,250,0.07),transparent)]"
      />
      <a
        href="#conteudo"
        className="sr-only z-30 rounded-lg bg-lime-400 px-4 py-2 font-medium text-zinc-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <AppHeader
        lastUpdated={metrics.lastUpdated}
        simulatedNow={metrics.simulatedNow}
        intervalMs={metrics.intervalMs}
        paused={metrics.paused}
        onTogglePause={() => metrics.setPaused(!metrics.paused)}
        tick={metrics.tick}
      />
      <main id="conteudo" tabIndex={-1} className="relative mx-auto outline-none max-w-[1600px] px-4 py-6 md:px-6">
        <Outlet />
        <footer className="mt-8 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-ink-subtle text-pretty">
          {IS_SIMULATED ? (
            <>
              Dados simulados no navegador (modo de demonstração) no formato das APIs UniLaunch. Coleta a cada{' '}
              {metrics.intervalMs / 1000} s, cada coleta ≙ 15 min. Modelo do projeto: W = CPU%/100 × 100 + 0,375 × RAM(GB) +
              0,01 × Disco(GB) + 0,02 × Rede(GB); kWh = W × horas ÷ 1000; kgCO₂e = kWh × gCO₂e/kWh ÷ 1000.
            </>
          ) : (
            <>
              Serviços, estados e métricas vindos do backend do GreenER, consultados a cada {metrics.intervalMs / 1000} s (o
              worker coleta em intervalo próprio). Energia e CO₂e aparecem como “—” enquanto o backend não calcular e expor
              esses valores.
            </>
          )}
        </footer>
      </main>
    </div>
  )
}
