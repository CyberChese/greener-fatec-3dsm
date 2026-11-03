import { CircleCheck, CircleDashed, Cloud, LoaderCircle, RefreshCw, ServerCrash, TriangleAlert, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { usePublicSummary, type PublicSummaryState } from '@/hooks/use-public-summary'
import { formatCount, formatDateTime, formatMeasure, formatShare, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PublicSummary, SummaryResult } from '@/services/summary'
import { GlassCard } from './glass-card'

/* ---------- peças visuais ---------- */

function MetricCard({
  icon: Icon,
  iconClass,
  label,
  value,
  unit,
  hint,
  children,
}: {
  icon: LucideIcon
  iconClass: string
  label: string
  value: string
  unit?: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <GlassCard className="flex items-start gap-4 p-4">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset', iconClass)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm text-zinc-400">{label}</h3>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          {/* tabular-nums: os dígitos têm largura fixa, então trocar o valor não faz o card "pular". */}
          <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-50" data-testid="metric-value">
            {value}
          </span>
          {unit ? <span className="text-xs text-ink-subtle">{unit}</span> : null}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
        {children}
      </div>
    </GlassCard>
  )
}

function SkeletonCard() {
  return (
    <div aria-hidden="true" className="h-[7.25rem] animate-pulse rounded-2xl border border-white/[0.06] bg-zinc-900/40" />
  )
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'

const SOURCE_NOTE: Record<SummaryResult['source'], string | null> = {
  api: null,
  derived: 'Resumo montado a partir das coletas da última hora (o endpoint de resumo ainda não está disponível no backend).',
  simulated: 'Dados simulados no navegador (modo de demonstração).',
}

function periodLabel(summary: PublicSummary) {
  if (!summary.period) return 'Total consolidado'
  return `De ${formatDateTime(summary.period.from)} a ${formatDateTime(summary.period.to)}`
}

/* ---------- cards ---------- */

function SummaryCards({ summary }: { summary: PublicSummary }) {
  const { total, active, unavailable, no_metrics } = summary.services
  const hasCollections = summary.last_collection_at !== null
  const share = formatShare(active, total)
  const degrees = total > 0 ? (active / total) * 360 : 0
  const hint = hasCollections ? periodLabel(summary) : 'Nenhuma coleta registrada ainda'

  return (
    <div className={GRID}>
      <MetricCard
        icon={Zap}
        iconClass="bg-amber-400/10 text-amber-300 ring-amber-400/30"
        label="Consumo de energia"
        value={hasCollections ? formatMeasure(summary.energy_kwh) : '—'}
        unit="kWh"
        hint={hint}
      />
      <MetricCard
        icon={Cloud}
        iconClass="bg-violet-400/10 text-violet-300 ring-violet-400/30"
        label="Emissões de CO₂e"
        value={hasCollections ? formatMeasure(summary.co2e_kg) : '—'}
        unit="kg CO₂e"
        hint={hint}
      />
      <GlassCard className="flex items-center gap-4 p-4">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#a3e635 ${degrees}deg, rgba(255,255,255,0.08) 0deg)` }}
          aria-hidden="true"
        >
          <span className="grid size-9 place-items-center rounded-full bg-zinc-950 font-mono text-[11px] font-semibold text-zinc-100">
            {share}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm text-zinc-400">Serviços ativos</h3>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-zinc-50">
            {formatCount(active)}
            <span className="text-base text-ink-subtle"> de {formatCount(total)}</span>
          </p>
          <p className="sr-only">
            {formatCount(active)} de {formatCount(total)} serviços ativos ({share})
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" aria-label="Situação dos serviços">
            <li className="inline-flex items-center gap-1 text-state-ok">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {formatCount(active)} ativos
            </li>
            <li className="inline-flex items-center gap-1 text-state-down">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {formatCount(unavailable)} indisponíveis
            </li>
            <li className="inline-flex items-center gap-1 text-state-warn">
              <CircleDashed className="size-3.5" aria-hidden="true" />
              {formatCount(no_metrics)} sem métricas
            </li>
          </ul>
        </div>
      </GlassCard>
    </div>
  )
}

/* ---------- visão completa (sem rede, testável) ---------- */

export interface ExecutiveHeaderViewProps extends Omit<PublicSummaryState, 'refreshing'> {
  refreshing?: boolean
  onRetry?: () => void
}

export function ExecutiveHeaderView({ data, updatedAt, error, initialLoading, refreshing = false, onRetry }: ExecutiveHeaderViewProps) {
  let body: ReactNode

  if (initialLoading && !data) {
    // Único momento em que o skeleton aparece.
    body = (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          Carregando indicadores consolidados…
        </p>
        <div className={GRID}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  } else if (!data) {
    // Falhou antes de receber qualquer dado: a página continua de pé, só este bloco avisa.
    body = (
      <GlassCard role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm">
        <ServerCrash className="size-5 shrink-0 text-orange-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-zinc-300">
          Não foi possível carregar os indicadores consolidados. {error}
        </p>
        {onRetry ? <RetryButton onRetry={onRetry} busy={refreshing} /> : null}
      </GlassCard>
    )
  } else if (data.summary.services.total === 0 && data.summary.last_collection_at === null) {
    body = (
      <GlassCard role="status" className="flex items-center gap-3 p-4 text-sm text-zinc-300">
        <CircleDashed className="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
        Ainda não há serviços nem coletas para consolidar. Os indicadores aparecerão após a primeira coleta.
      </GlassCard>
    )
  } else {
    body = <SummaryCards summary={data.summary} />
  }

  const sourceNote = data ? SOURCE_NOTE[data.source] : null

  return (
    <section aria-labelledby="executive-summary-title" aria-busy={refreshing || initialLoading} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="executive-summary-title" className="text-base font-semibold text-zinc-100">
          Indicadores consolidados
        </h2>
        {updatedAt ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
            {refreshing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Atualizado às {formatTime(updatedAt)}
          </p>
        ) : null}
      </div>

      {/* Erro de atualização com dados anteriores: avisa, mas mantém os valores visíveis. */}
      {data && error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200"
        >
          <ServerCrash className="size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            Falha ao atualizar os indicadores ({error}).{' '}
            {updatedAt ? `Exibindo os valores de ${formatTime(updatedAt)}.` : 'Exibindo os últimos valores conhecidos.'}
          </p>
          {onRetry ? <RetryButton onRetry={onRetry} busy={refreshing} /> : null}
        </div>
      ) : null}

      {body}

      {sourceNote ? <p className="text-xs text-ink-subtle">{sourceNote}</p> : null}
    </section>
  )
}

function RetryButton({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-edge bg-zinc-900/70 px-3 text-sm text-zinc-100 outline-none hover:bg-zinc-800 focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/40 disabled:opacity-60"
    >
      <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} aria-hidden="true" />
      Tentar novamente
    </button>
  )
}

/* ---------- versão conectada à API ---------- */

/** Header executivo ligado ao resumo público (GET /api/metrics/summary). */
export function ExecutiveHeader({ intervalMs }: { intervalMs: number }) {
  const { retry, ...state } = usePublicSummary({ intervalMs })
  return <ExecutiveHeaderView {...state} onRetry={retry} />
}