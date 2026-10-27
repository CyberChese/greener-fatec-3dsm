import { Clock, LayoutDashboard, Leaf, Pause, Play, ShieldCheck, Timer } from 'lucide-react'
import { NavLink } from 'react-router'
import { IS_SIMULATED } from '@/lib/dataSource'
import { formatDateTime, formatSimulatedClock } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  lastUpdated: string | null
  simulatedNow: string | null
  intervalMs: number
  paused: boolean
  onTogglePause: () => void
  tick: number
}

const TABS: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: '/', label: 'Observatório', icon: LayoutDashboard, end: true },
  { to: '/admin', label: 'Área do Administrador', icon: ShieldCheck },
]

export function AppHeader({
  lastUpdated,
  simulatedNow,
  intervalMs,
  paused,
  onTogglePause,
  tick,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-lime-400/15 text-lime-400 ring-1 ring-lime-400/30">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-zinc-50">
            green<span className="text-lime-400">ER</span>
          </span>
        </div>

        <nav aria-label="Seções" className="order-3 w-full md:order-none md:w-auto">
          <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-1">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none',
                    isActive ? 'bg-lime-400 text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs md:gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold tracking-wider ring-1 ring-inset',
              paused ? 'bg-zinc-800 text-zinc-300 ring-white/10' : 'bg-lime-400/10 text-lime-300 ring-lime-400/30',
            )}
            role="status"
            aria-live="polite"
          >
            {paused ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-400 opacity-70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-lime-400" />
              </span>
            )}
            {paused ? 'PAUSADO' : 'AO VIVO'}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-zinc-300 ring-1 ring-white/10 ring-inset">
            <Clock className="size-3.5 text-zinc-500" aria-hidden="true" />
            <span className="text-zinc-500">Última atualização</span>
            <time className="font-mono tabular-nums text-zinc-100" dateTime={lastUpdated ?? undefined}>
              {lastUpdated ? formatDateTime(lastUpdated) : 'aguardando…'}
            </time>
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-zinc-300 ring-1 ring-white/10 ring-inset"
            title={IS_SIMULATED ? 'Cada coleta real representa 15 minutos de operação simulada' : 'Intervalo entre consultas ao backend'}
          >
            <Timer className="size-3.5 text-zinc-500" aria-hidden="true" />
            <span className="text-zinc-500">Intervalo</span>
            <span className="font-mono tabular-nums text-zinc-100">{intervalMs / 1000}s{IS_SIMULATED ? ' ≙ 15 min' : ''}</span>
          </span>

          {IS_SIMULATED ? (
          <span className="hidden items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-zinc-300 ring-1 ring-white/10 ring-inset xl:inline-flex">
            <span className="text-zinc-500">Relógio simulado</span>
            <span className="font-mono tabular-nums text-zinc-100">
              {simulatedNow ? formatSimulatedClock(simulatedNow) : '—'}
            </span>
            <span className="text-zinc-500">· coleta #{tick}</span>
          </span>
          ) : null}

          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 font-medium text-zinc-200 ring-1 ring-white/10 ring-inset transition-colors hover:bg-zinc-800 hover:ring-lime-400/40"
          >
            {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            {paused ? 'Retomar' : 'Pausar'}
          </button>
        </div>
      </div>
    </header>
  )
}
