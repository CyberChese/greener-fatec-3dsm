import { RefreshCw, ServerCrash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import type { UseMetricsResult } from '@/hooks/use-metrics'
import { usePeriodTotals } from '@/hooks/use-period-totals'
import { haversineKm, totalsInRange, type PeriodTotals } from '@/lib/calculations'
import { describePeriod, matchesSearch, resolveRange } from '@/lib/dashboard-filters'
import { IS_SIMULATED } from '@/lib/dataSource'
import { cn } from '@/lib/utils'
import { CollectionStatusPanel } from './collection-status-panel'
import type { DashboardFilters, RankingMetric, ServiceSnapshot } from '@/lib/types'
import { ComparisonPanel } from './comparison-panel'
import { MAX_COMPARED_SERVICES, toggleComparisonSelection } from './comparison-data'
import { CardHeading, GlassCard } from './glass-card'
import { EvolutionChart } from './evolution-chart'
import { EventsFeed } from './events-feed'
import { FiltersBar } from './filters-bar'
import { FiltersPanel } from './filters-panel'
import { ImpactRanking } from './impact-ranking'
import { ExecutiveHeader, ExecutiveHeaderView } from './executive-header'
import { DashboardSkeleton, EmptyServices } from './loading-state'
import { ServicesSection } from './services-section'
import { WorldMap } from './world-map'
import { sumTotals } from '@/services/ranking'
import { summaryFromSnapshots } from '@/services/summary'

const EMPTY_TOTALS = new Map<string, PeriodTotals>()

const EMPTY_FILTERS: DashboardFilters = {
  status: 'all',
  point: { latitude: null, longitude: null, radiusKm: 3000 },
}

function matchesFilters(s: ServiceSnapshot, filters: DashboardFilters, search: string) {
  if (filters.status !== 'all' && s.status !== filters.status) return false
  if (!matchesSearch(s, search)) return false
  const { latitude, longitude, radiusKm } = filters.point
  if (latitude != null && longitude != null) {
    if (s.location.latitude == null || s.location.longitude == null) return false
    if (haversineKm(latitude, longitude, s.location.latitude, s.location.longitude) > radiusKm) return false
  }
  return true
}

export function DashboardView({ metrics }: { metrics: UseMetricsResult }) {
  const { snapshots, history, series, events, tick, aggregatorError, carbonError, lastUpdated, simulatedNow, intervalMs, refreshing, retry } = metrics
  const filterControls = useDashboardFilters()
  const timeFilters = filterControls.filters
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const period = usePeriodTotals(timeFilters, lastUpdated, !IS_SIMULATED)
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('co2e')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const periodLabel = IS_SIMULATED ? `${describePeriod(timeFilters)} (relógio simulado)` : describePeriod(timeFilters)

  const simulatedRange = useMemo(() => {
    if (!IS_SIMULATED || !simulatedNow) return null
    const range = resolveRange(timeFilters, Date.parse(simulatedNow))
    return { fromMs: range.from.getTime(), toMs: range.to.getTime() }
  }, [timeFilters, simulatedNow])

  const periodTotals = useMemo(() => {
    if (!IS_SIMULATED) return period.totals ?? EMPTY_TOTALS
    if (!simulatedRange) return EMPTY_TOTALS
    return totalsInRange(history, simulatedRange.fromMs, simulatedRange.toMs)
  }, [period.totals, history, simulatedRange])

  const simulatedHistory = useMemo(() => {
    if (!simulatedRange) return history
    return history.filter((r) => {
      const at = Date.parse(r.simulatedAt)
      return at >= simulatedRange.fromMs && at <= simulatedRange.toMs
    })
  }, [history, simulatedRange])

  const simulatedSeries = useMemo(() => {
    if (!simulatedRange) return series
    const ticks = new Set<number>()
    for (const r of history) {
      const at = Date.parse(r.simulatedAt)
      if (at >= simulatedRange.fromMs && at <= simulatedRange.toMs) ticks.add(r.tick)
    }
    return series.filter((point) => ticks.has(point.tick))
  }, [series, history, simulatedRange])

  const simulatedSummary = useMemo(() => {
    if (!IS_SIMULATED || tick === 0 || !simulatedRange) return null
    const totals = sumTotals(periodTotals)
    return {
      summary: {
        ...summaryFromSnapshots(snapshots, lastUpdated),
        energy_kwh: totals.energyKwh,
        co2e_kg: totals.co2eKg,
        period: {
          from: new Date(simulatedRange.fromMs).toISOString(),
          to: new Date(simulatedRange.toMs).toISOString(),
        },
      },
      source: 'simulated' as const,
    }
  }, [snapshots, lastUpdated, tick, periodTotals, simulatedRange])

  const periodSummary = useMemo(
    () => (period.totals && period.range ? { ...sumTotals(period.totals), ...period.range } : null),
    [period.totals, period.range],
  )

  const filtered = useMemo(
    () => snapshots.filter((s) => matchesFilters(s, filters, timeFilters.search)),
    [snapshots, filters, timeFilters.search],
  )
  const compared = snapshots.filter((s) => selectedIds.includes(s.id))

  const toggle = (id: string) => setSelectedIds((ids) => toggleComparisonSelection(ids, id))

  const apiErrors = [aggregatorError, carbonError].filter(Boolean) as string[]

  // Título e indicadores consolidados ficam sempre visíveis: têm carregamento e erro próprios (TASK-024).
  const top = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-lime-400 uppercase">
            Centro de inteligência ambiental
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 text-balance md:text-4xl">
            Observatório planetário
          </h1>
          <p className="mt-1 text-sm text-zinc-400 text-pretty">
            Energia e emissões de CO₂e dos serviços monitorados, estimadas a partir das métricas de infraestrutura.
          </p>
        </div>
      </div>

      <FiltersBar
        {...filterControls}
        periodLabel={periodLabel}
        loading={period.loading}
        error={period.error}
        resultCount={tick === 0 ? undefined : filtered.length}
        totalCount={tick === 0 ? undefined : snapshots.length}
      />

      {IS_SIMULATED ? (
        <ExecutiveHeaderView
          data={simulatedSummary}
          updatedAt={lastUpdated}
          error={aggregatorError}
          initialLoading={tick === 0}
        />
      ) : (
        <ExecutiveHeader intervalMs={intervalMs} period={periodSummary} periodError={period.error} />
      )}
    </>
  )

  // Estados de carregamento e de ausência de dados do restante do painel (IHC04).
  if (tick === 0 || snapshots.length === 0) {
    return (
      <div id="view-dashboard" role="tabpanel" className="flex flex-col gap-5">
        {top}
        {tick === 0 ? <DashboardSkeleton /> : <EmptyServices error={apiErrors[0] ?? null} />}
      </div>
    )
  }

  return (
    <div id="view-dashboard" role="tabpanel" className="flex flex-col gap-5">
      {top}

      {!IS_SIMULATED ? (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          <ServerCrash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Serviços, estados e métricas (CPU, memória, disco e rede) reais, vindos do backend. A energia e o CO₂e de cada
            serviço e os indicadores consolidados acima somam as coletas do período selecionado ({periodLabel}). “—”
            indica ausência de medição.
          </p>
        </div>
      ) : null}

      {!IS_SIMULATED ? <CollectionStatusPanel /> : null}

      {apiErrors.length > 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
          <ServerCrash className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Falha temporária na consulta de dados — mantendo dados anteriores e tentando reconectar automaticamente.
            </p>
            <p className="text-orange-200/80">{apiErrors.join(' · ')}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-edge bg-zinc-900/70 px-3 text-sm text-zinc-100 outline-none hover:bg-zinc-800 focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/40 disabled:opacity-60"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <FiltersPanel
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
          resultCount={filtered.length}
          totalCount={snapshots.length}
        />
        <WorldMap
          services={filtered}
          periodTotals={periodTotals}
          periodLabel={periodLabel}
          point={filters.point}
          selectedId={highlightId}
          onPickPoint={(latitude, longitude) =>
            setFilters((f) => ({ ...f, point: { ...f.point, latitude, longitude } }))
          }
          onSelectService={(s) => {
            setHighlightId(s.id)
            if (s.location.latitude != null && s.location.longitude != null) {
              setFilters((f) => ({
                ...f,
                point: { ...f.point, latitude: s.location.latitude, longitude: s.location.longitude },
              }))
            }
          }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {IS_SIMULATED ? (
          <EvolutionChart series={simulatedSeries} />
        ) : (
          <GlassCard className="flex flex-col gap-2 self-start" aria-labelledby="pending-title">
            <CardHeading eyebrow="Evolução temporal" title="Compare a evolução no tempo" id="pending-title" />
            <p className="text-sm text-zinc-400">
              Marque de 2 a 4 serviços em “Comparar” nos cartões abaixo para ver a evolução da energia e das emissões ao longo
              do período selecionado ({periodLabel}), com legenda interativa e a economia de emissões entre eles.
            </p>
          </GlassCard>
        )}
        <ImpactRanking
          services={filtered}
          periodTotals={periodTotals}
          metric={rankingMetric}
          onMetricChange={setRankingMetric}
          periodLabel={periodLabel}
        />
      </div>

      <ServicesSection
        services={filtered}
        periodTotals={periodTotals}
        periodLabel={periodLabel}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={(ids) => setSelectedIds(ids.slice(0, MAX_COMPARED_SERVICES))}
        highlightId={highlightId}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ComparisonPanel
          services={compared}
          periodTotals={periodTotals}
          periodLabel={periodLabel}
          simulatedHistory={simulatedHistory}
          simulated={IS_SIMULATED}
          timeFilters={timeFilters}
          onRemove={toggle}
          onClear={() => setSelectedIds([])}
        />
        <EventsFeed events={events} />
      </div>
    </div>
  )
}