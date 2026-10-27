import { ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CardHeading, GlassCard } from '@/components/dashboard/glass-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { IS_SIMULATED } from '@/lib/dataSource'
import { recordsToCsv } from '@/lib/csv'
import { formatGb, formatKg, formatKwh, formatPercent, formatSimulatedClock, formatTime } from '@/lib/format'
import type { CollectionRecord, ServiceStatus } from '@/lib/types'

const LIMIT_OPTIONS = [
  { value: 40, label: '40 mais recentes' },
  { value: 200, label: '200 mais recentes' },
  { value: 1500, label: 'Todos (até 1.500)' },
]
const PAGE_SIZE = 10

const selectClass =
  'h-10 rounded-lg border border-edge bg-zinc-950/60 px-3 text-sm text-zinc-100 outline-none focus-visible:border-lime-400/60'

interface HistoryTableProps {
  history: CollectionRecord[]
  onClear: () => void
  intervalSeconds: number
}

export function HistoryTable({ history, onClear, intervalSeconds }: HistoryTableProps) {
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | ''>('')
  const [limit, setLimit] = useState(LIMIT_OPTIONS[0].value)
  const [page, setPage] = useState(0)

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of history) map.set(r.serviceId, r.serviceName)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [history])

  const filtered = useMemo(
    () =>
      history.filter(
        (r) => (!serviceFilter || r.serviceId === serviceFilter) && (!statusFilter || r.status === statusFilter),
      ),
    [history, serviceFilter, statusFilter],
  )
  const recent = useMemo(() => filtered.slice(-limit).reverse(), [filtered, limit])

  function exportCsv() {
    const blob = new Blob(['\uFEFF' + recordsToCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `greener-historico-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const pageCount = Math.max(1, Math.ceil(recent.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = recent.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <GlassCard aria-labelledby="history-title" className="p-0">
      <div className="px-5 pt-5">
        <CardHeading
          eyebrow="RF10 · Histórico de coletas"
          title="Registros mais recentes"
          id="history-title"
          aside={<span className="font-mono text-xs text-ink-subtle">{history.length} registros armazenados</span>}
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="history-service">Filtrar por serviço</label>
          <select
            id="history-service"
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value)
              setPage(0)
            }}
            className={selectClass}
          >
            <option value="">Todos os serviços</option>
            {serviceOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="history-status">Filtrar por estado</label>
          <select
            id="history-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ServiceStatus | '')
              setPage(0)
            }}
            className={selectClass}
          >
            <option value="">Todos os estados</option>
            <option value="active">✓ Ativo</option>
            <option value="unavailable">▲ Indisponível</option>
            <option value="no_metrics">◌ Sem métricas</option>
          </select>
          <label className="sr-only" htmlFor="history-limit">Quantidade de registros</label>
          <select
            id="history-limit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(0)
            }}
            className={selectClass}
          >
            {LIMIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-lime-400/40 disabled:opacity-40"
          >
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => {
              onClear()
              setPage(0)
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-400/30 px-3 text-sm font-medium text-state-down transition-colors hover:bg-rose-400/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Limpar histórico
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Histórico paginado das coletas de métricas</caption>
          <thead className="border-y border-white/[0.06] bg-zinc-950/40 text-xs text-ink-subtle">
            <tr>
              <th scope="col" className="py-3 pr-3 pl-5 font-medium">Coleta</th>
              <th scope="col" className="px-3 py-3 font-medium">{IS_SIMULATED ? 'Horário simulado' : 'Horário da coleta'}</th>
              <th scope="col" className="px-3 py-3 font-medium">Recebida às</th>
              <th scope="col" className="px-3 py-3 font-medium">Serviço</th>
              <th scope="col" className="px-3 py-3 font-medium">Estado</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">CPU</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Memória</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">kWh</th>
              <th scope="col" className="py-3 pr-5 pl-3 text-right font-medium">kgCO₂e</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-ink-subtle">
                  Nenhum registro encontrado. Novas coletas aparecem a cada {intervalSeconds} segundos.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-3 pl-5 font-mono text-xs text-ink-subtle">#{r.tick}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-300">{formatSimulatedClock(r.simulatedAt)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-subtle">{formatTime(r.collectedAt)}</td>
                  <td className="px-3 py-2.5 text-zinc-200">
                    {r.serviceName}
                    <span className="block font-mono text-xs text-ink-subtle">{r.regionCode}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-300">{formatPercent(r.cpuPercent)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-300">{formatGb(r.memoryGb)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-amber-300">{formatKwh(r.energyKwh)}</td>
                  <td className="py-2.5 pr-5 pl-3 text-right font-mono tabular-nums text-violet-300">{formatKg(r.co2eKg)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Paginação do histórico" className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
        <p className="text-xs text-ink-subtle">
          Página {safePage + 1} de {pageCount} · {recent.length} de {filtered.length} registros filtrados
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            aria-label="Página anterior"
            className="grid size-9 place-items-center rounded-lg border border-edge text-zinc-300 hover:border-lime-400/40 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-current={i === safePage ? 'page' : undefined}
              className={`grid size-9 place-items-center rounded-lg font-mono text-xs ${
                i === safePage ? 'bg-lime-400 text-zinc-950' : 'border border-edge text-zinc-300 hover:border-lime-400/40'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Próxima página"
            className="grid size-9 place-items-center rounded-lg border border-edge text-zinc-300 hover:border-lime-400/40 disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </GlassCard>
  )
}
