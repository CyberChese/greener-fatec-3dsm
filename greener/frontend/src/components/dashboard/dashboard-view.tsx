import { ServerCrash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import type { UseMetricsResult } from '@/hooks/use-metrics'
import { aggregateSnapshots, haversineKm, totalsByService } from '@/lib/calculations'
import type { PeriodTotals } from '@/lib/calculations'
import { IS_SIMULATED } from '@/lib/dataSource'
import { CollectionStatusPanel } from './collection-status-panel'
import type { DashboardFilters, Period, RankingMetric, ServiceSnapshot } from '@/lib/types'
import { ComparisonPanel } from './comparison-panel'
import { CardHeading, GlassCard } from './glass-card'
import { EvolutionChart } from './evolution-chart'
import { EventsFeed } from './events-feed'
import { FiltersPanel } from './filters-panel'
import { ImpactRanking } from './impact-ranking'
import { KpiCards } from './kpi-cards'
import { DashboardSkeleton, EmptyServices } from './loading-state'
import { ServicesSection } from './services-section'
import { WorldMap } from './world-map'

const EMPTY_FILTERS: DashboardFilters = {
  search: '',
  status: 'all',
  point: { latitude: null, longitude: null, radiusKm: 3000 },
}

function matchesFilters(s: ServiceSnapshot, filters: DashboardFilters) {
  if (filters.status !== 'all' && s.status !== filters.status) return false
  const query = filters.search.trim().toLowerCase()
  if (query) {
    const haystack = [s.name, s.id, s.location.country, s.location.region, s.location.city ?? '', s.location.region_code]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(query)) return false
  }
  const { latitude, longitude, radiusKm } = filters.point
  if (latitude != null && longitude != null) {
    if (s.location.latitude == null || s.location.longitude == null) return false
    if (haversineKm(latitude, longitude, s.location.latitude, s.location.longitude) > radiusKm) return false
  }
  return true
}

export function DashboardView({ metrics }: { metrics: UseMetricsResult }) {
  const { snapshots, history, series, events, tick, aggregatorError, carbonError } = metrics
  const { settings } = useSettings()
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [period, setPeriod] = useState<Period>(settings.defaultPeriod)
  // Quando o período padrão muda nas configurações, o painel acompanha (ajuste durante a renderização).
  const [syncedDefault, setSyncedDefault] = useState(settings.defaultPeriod)
  if (syncedDefault !== settings.defaultPeriod) {
    setSyncedDefault(settings.defaultPeriod)
    setPeriod(settings.defaultPeriod)
  }
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('co2e')
  const [selectedIds, setSelectedIds] = useState<string[]>(['billing-api', 'auth-api', 'search-api'])
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const fromTick = period === 'last10' ? Math.max(1, tick - 9) : 1
  const periodLabel =
    period === 'last10'
      ? `últimas ${Math.min(10, tick)} coletas${IS_SIMULATED ? ` (${Math.min(10, tick) * 15} min simulados)` : ''}`
      : `sessão inteira (${tick} coletas)`

  // No modo real não há energia/CO2e por serviço ainda: o mapa vazio faz a tela mostrar "—" em vez de zero.
  const periodTotals = useMemo(
    () => (IS_SIMULATED ? totalsByService(history, fromTick) : new Map<string, PeriodTotals>()),
    [history, fromTick],
  )
  const current = useMemo(() => aggregateSnapshots(snapshots), [snapshots])
  const periodSum = useMemo(() => {
    let energyKwh = 0
    let co2eKg = 0
    for (const t of periodTotals.values()) {
      energyKwh += t.energyKwh
      co2eKg += t.co2eKg
    }
    return { energyKwh, co2eKg }
  }, [periodTotals])

  const filtered = useMemo(() => snapshots.filter((s) => matchesFilters(s, filters)), [snapshots, filters])
  const compared = snapshots.filter((s) => selectedIds.includes(s.id))

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const apiErrors = [aggregatorError, carbonError].filter(Boolean) as string[]

  // Estados de carregamento e de ausência de dados (IHC04).
  if (tick === 0) return <DashboardSkeleton />
  if (snapshots.length === 0) return <EmptyServices error={apiErrors[0] ?? null} />

  return (
    <div id="view-dashboard" role="tabpanel" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-lime-400 uppercase">
            Centro de inteligência ambiental
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 text-balance md:text-4xl">
            Observatório planetário
          </h1>
          <p className="mt-1 text-sm text-zinc-400 text-pretty">
            Energia e emissões de CO₂e dos serviços monitorados, estimadas a partir das métricas de infraestrutura.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Período
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-10 rounded-lg border border-white/10 bg-zinc-900/70 px-3 text-sm text-zinc-100 outline-none focus-visible:border-lime-400/60"
          >
            <option value="last10">Últimas 10 coletas</option>
            <option value="session">Sessão inteira</option>
          </select>
        </label>
      </div>

      {!IS_SIMULATED ? (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          <ServerCrash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Serviços e estados reais, vindos do backend. Energia, CO₂e e intensidade de carbono aparecem como “—” porque o
            backend ainda não calcula nem expõe esses valores.
          </p>
        </div>
      ) : null}

      {!IS_SIMULATED ? <CollectionStatusPanel /> : null}

      {apiErrors.length > 0 ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
          <ServerCrash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Falha temporária na consulta de dados — exibindo últimos dados conhecidos.</p>
            <p className="text-orange-200/80">{apiErrors.join(' · ')}</p>
          </div>
        </div>
      ) : null}

      <KpiCards
        periodLabel={period === 'last10' ? 'Últimas 10 coletas' : 'Sessão inteira'}
        periodEnergyKwh={IS_SIMULATED ? periodSum.energyKwh : null}
        periodCo2eKg={IS_SIMULATED ? periodSum.co2eKg : null}
        current={current}
      />

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
          <>
            <EvolutionChart series={series} />
            <ImpactRanking
              services={filtered}
              periodTotals={periodTotals}
              metric={rankingMetric}
              onMetricChange={setRankingMetric}
              periodLabel={periodLabel}
            />
          </>
        ) : (
          <GlassCard className="flex flex-col gap-2 xl:col-span-2" aria-labelledby="pending-title">
            <CardHeading eyebrow="Evolução e ranking de impacto" title="Disponível quando o backend expuser energia e CO₂e" id="pending-title" />
            <p className="text-sm text-zinc-400">
              O gráfico de evolução temporal e o ranking de maior impacto dependem dos valores de energia e emissão por coleta,
              que o worker do backend ainda vai calcular e gravar.
            </p>
          </GlassCard>
        )}
      </div>

      <ServicesSection
        services={filtered}
        periodTotals={periodTotals}
        periodLabel={periodLabel}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={setSelectedIds}
        highlightId={highlightId}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ComparisonPanel
          services={compared}
          periodTotals={periodTotals}
          periodLabel={periodLabel}
          onRemove={toggle}
          onClear={() => setSelectedIds([])}
        />
        <EventsFeed events={events} />
      </div>
    </div>
  )
}
