import { Clock, LayoutDashboard, Leaf, Map as MapIcon, Menu, Pause, Play, ShieldCheck, Timer, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
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
  { to: '/mapa', label: 'Mapa', icon: MapIcon },
  { to: '/admin', label: 'Área do Administrador', icon: ShieldCheck },
]

const chipClass =
  'inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-zinc-300 ring-1 ring-inset ring-white/10'

function NavTabs({ vertical, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Seções">
      <div
        className={cn(
          'gap-1 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-1',
          vertical ? 'flex flex-col' : 'flex',
        )}
      >
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                vertical ? 'min-h-11 py-2' : 'py-2',
                isActive ? 'bg-lime-400 text-zinc-950' : 'text-zinc-300 hover:bg-white/5 hover:text-zinc-50',
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AppHeader({ lastUpdated, simulatedNow, intervalMs, paused, onTogglePause, tick }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)

  // Escape fecha o menu móvel e devolve o foco ao botão que o abriu.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false)
      menuButton.current?.focus()
    }
  }

  const lastUpdatedChip = (
    <span className={chipClass}>
      <Clock className="size-3.5 text-ink-subtle" aria-hidden="true" />
      <span className="text-ink-subtle">Última atualização</span>
      <time className="font-mono tabular-nums text-zinc-100" dateTime={lastUpdated ?? undefined}>
        {lastUpdated ? formatDateTime(lastUpdated) : 'aguardando…'}
      </time>
    </span>
  )

  const intervalChip = (
    <span
      className={chipClass}
      title={IS_SIMULATED ? 'Cada coleta real representa 15 minutos de operação simulada' : 'Intervalo entre consultas ao backend'}
    >
      <Timer className="size-3.5 text-ink-subtle" aria-hidden="true" />
      <span className="text-ink-subtle">Intervalo</span>
      <span className="font-mono tabular-nums text-zinc-100">
        {intervalMs / 1000}s{IS_SIMULATED ? ' ≙ 15 min' : ''}
      </span>
    </span>
  )

  const pauseButton = (
    <button
      type="button"
      onClick={onTogglePause}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-edge ring-inset transition-colors hover:bg-zinc-800 hover:ring-lime-400/40"
    >
      {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
      {paused ? 'Retomar' : 'Pausar'}
    </button>
  )

  return (
    <header onKeyDown={handleKeyDown} className="sticky top-0 z-20 border-b border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-lime-400/15 text-lime-400 ring-1 ring-lime-400/30">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-zinc-50">
            green<span className="text-lime-400">ER</span>
          </span>
        </div>

        <div className="hidden xl:block">
          <NavTabs />
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs md:gap-3">
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

          <div className="hidden items-center gap-2 xl:flex xl:gap-3">
            {lastUpdatedChip}
            {intervalChip}
            {IS_SIMULATED ? (
              <span className={cn(chipClass, 'hidden 2xl:inline-flex')}>
                <span className="text-ink-subtle">Relógio simulado</span>
                <span className="font-mono tabular-nums text-zinc-100">
                  {simulatedNow ? formatSimulatedClock(simulatedNow) : '—'}
                </span>
                <span className="text-ink-subtle">· coleta #{tick}</span>
              </span>
            ) : null}
            {pauseButton}
          </div>

          <button
            ref={menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-zinc-100 hover:border-lime-400/40 xl:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only sm:not-sr-only">Menu</span>
          </button>
        </div>
      </div>

      <div id={menuId} className={cn('mx-auto max-w-[1600px] flex-col gap-3 px-4 pb-4 xl:hidden', menuOpen ? 'flex' : 'hidden')}>
        <NavTabs
          vertical
          onNavigate={() => {
            setMenuOpen(false)
            menuButton.current?.focus()
          }}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {lastUpdatedChip}
          {intervalChip}
          {pauseButton}
        </div>
      </div>
    </header>
  )
}
