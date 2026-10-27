import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CardHeading, GlassCard } from '@/components/dashboard/glass-card'
import { useServiceHistory } from '@/hooks/use-service-history'
import { collectionsToCsv } from '@/lib/csv'
import { formatDateTime, formatGb, formatPercent } from '@/lib/format'
import type { ServiceSnapshot } from '@/lib/types'
import type { BackendCollection } from '@/services/backend-services'

const RANGES = [
  { value: 15 * 60_000, label: 'Últimos 15 minutos' },
  { value: 60 * 60_000, label: 'Última hora' },
  { value: 6 * 60 * 60_000, label: 'Últimas 6 horas' },
  { value: 24 * 60 * 60_000, label: 'Últimas 24 horas' },
]
const PAGE_SIZE = 10

const selectClass =
  'h-10 rounded-lg border border-edge bg-zinc-950/60 px-3 text-sm text-zinc-100 outline-none focus-visible:border-lime-400/60'

const asNumber = (value: string | number | null) => (value === null || value === '' ? null : Number(value))

interface PanelViewProps {
  records: BackendCollection[]
  loading: boolean
  error: string | null
  page: number
  onPage: (page: number) => void
}

/** Tabela do histórico real, da coleta mais recente para a mais antiga (parte visual, sem rede). */
export function HistoryRows({ records, loading, error, page, onPage }: PanelViewProps) {
  const newestFirst = useMemo(() => [...records].reverse(), [records])
  const pageCount = Math.max(1, Math.ceil(newestFirst.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = newestFirst.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <>
      {error ? (
        <p role="alert" className="px-5 pb-3 text-sm text-state-down">
          Não foi possível atualizar o histórico: {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Coletas de métricas do serviço selecionado</caption>
          <thead className="text-xs text-ink-subtle">
            <tr className="border-y border-white/[0.08]">
              <th scope="col" className="px-5 py-2.5 font-medium">Recebida em</th>
              <th scope="col" className="px-3 py-2.5 font-medium">CPU</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Memória</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Disco</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Rede</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={5} role="status" className="px-5 py-6 text-center font-sans text-zinc-400">
                  Carregando histórico…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center font-sans text-zinc-400">
                  Nenhuma coleta registrada neste período.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.idCollections} className="border-b border-white/[0.04]">
                  <td className="px-5 py-2.5 font-sans text-zinc-300">{formatDateTime(r.timestamp)}</td>
                  <td className="px-3 py-2.5">{formatPercent(asNumber(r.cpu_usage))}</td>
                  <td className="px-3 py-2.5">{formatGb(asNumber(r.memory_usage))}</td>
                  <td className="px-3 py-2.5">{formatGb(asNumber(r.storage_usage))}</td>
                  <td className="px-5 py-2.5">{formatGb(asNumber(r.network_io))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-5 py-3 text-xs text-ink-subtle">
        <span>
          Página {safePage + 1} de {pageCount}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={safePage === 0}
            onClick={() => onPage(safePage - 1)}
            className="grid size-8 place-items-center rounded-lg border border-edge hover:border-lime-400/40 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={safePage >= pageCount - 1}
            onClick={() => onPage(safePage + 1)}
            className="grid size-8 place-items-center rounded-lg border border-edge hover:border-lime-400/40 disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}

/** Histórico real de coletas (RF10), vindo do backend: escolhe um serviço e um período. */
export function ServiceHistoryPanel({ services }: { services: ServiceSnapshot[] }) {
  const options = useMemo(() => services.filter((s) => s.backendId), [services])
  const [selected, setSelected] = useState('')
  const [rangeMs, setRangeMs] = useState(RANGES[1].value)
  const [page, setPage] = useState(0)

  const current = options.find((s) => s.backendId === selected) ?? options[0] ?? null
  const { records, loading, error } = useServiceHistory(current?.backendId ?? null, rangeMs)

  function exportCsv() {
    if (!current) return
    const blob = new Blob(['﻿' + collectionsToCsv(current.name, records)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `greener-historico-${current.id}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <GlassCard aria-labelledby="real-history-title" className="p-0">
      <div className="px-5 pt-5">
        <CardHeading
          eyebrow="RF10 · Histórico de coletas"
          title="Coletas registradas pelo backend"
          id="real-history-title"
          aside={<span className="font-mono text-xs text-ink-subtle">{records.length} coletas no período</span>}
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="real-history-service">Serviço</label>
          <select
            id="real-history-service"
            value={current?.backendId ?? ''}
            onChange={(e) => {
              setSelected(e.target.value)
              setPage(0)
            }}
            disabled={options.length === 0}
            className={selectClass}
          >
            {options.length === 0 ? <option value="">Nenhum serviço disponível</option> : null}
            {options.map((s) => (
              <option key={s.backendId} value={s.backendId}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="real-history-range">Período</label>
          <select
            id="real-history-range"
            value={rangeMs}
            onChange={(e) => {
              setRangeMs(Number(e.target.value))
              setPage(0)
            }}
            className={selectClass}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={records.length === 0}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-lime-400/40 disabled:opacity-40"
          >
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>
      <HistoryRows records={records} loading={loading} error={error} page={page} onPage={setPage} />
    </GlassCard>
  )
}
