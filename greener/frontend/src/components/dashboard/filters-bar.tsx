import { CalendarRange, LoaderCircle, Search, TriangleAlert, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DashboardFiltersControls } from '@/hooks/use-dashboard-filters'
import { useDebouncedSearch } from '@/hooks/use-debounced-search'
import {
  PRESET_LABELS,
  QUICK_PRESETS,
  SEARCH_MAX_LENGTH,
  hasActiveFilters,
  toDateInput,
  validateCustomRange,
  type QuickPreset,
} from '@/lib/dashboard-filters'
import { cn } from '@/lib/utils'
import { GlassCard } from './glass-card'

interface FiltersBarProps extends DashboardFiltersControls {
  periodLabel: string
  loading?: boolean
  error?: string | null
  resultCount?: number
  totalCount?: number
  today?: string
}

const fieldClass =
  'h-10 rounded-lg border border-edge bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-ink-subtle outline-none transition-colors focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400'

const segmentClass = (active: boolean) =>
  cn(
    'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
    active ? 'bg-lime-400 text-zinc-950' : 'text-zinc-300 hover:bg-white/5 hover:text-zinc-50',
  )

export function FiltersBar({
  filters,
  setPreset,
  applyCustomRange,
  setSearch,
  clear,
  periodLabel,
  loading = false,
  error = null,
  resultCount,
  totalCount,
  today,
}: FiltersBarProps) {
  const [currentDay] = useState(() => toDateInput(new Date()))
  const maxDay = today ?? currentDay
  const appliedKey = `${filters.from ?? ''}|${filters.to ?? ''}`

  const [customOpen, setCustomOpen] = useState(false)
  const [draft, setDraft] = useState({ from: filters.from ?? '', to: filters.to ?? '' })
  const [draftError, setDraftError] = useState<string | null>(null)
  const [syncedKey, setSyncedKey] = useState(appliedKey)
  const [text, setText] = useDebouncedSearch(filters.search, setSearch)

  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey)
    setDraftError(null)
    if (filters.preset === 'custom') setDraft({ from: filters.from ?? '', to: filters.to ?? '' })
  }

  const customActive = filters.preset === 'custom'
  const showCustom = customOpen || customActive
  const draftApplied = customActive && draft.from === filters.from && draft.to === filters.to

  function choosePreset(preset: QuickPreset) {
    setCustomOpen(false)
    setDraftError(null)
    setPreset(preset)
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateCustomRange(draft.from || null, draft.to || null, maxDay)
    setDraftError(problem)
    if (problem) return
    applyCustomRange(draft.from, draft.to)
    setCustomOpen(false)
  }

  function clearAll() {
    setCustomOpen(false)
    setDraftError(null)
    clear()
  }

  const showCount = resultCount !== undefined && totalCount !== undefined

  return (
    <GlassCard aria-label="Filtros de período e busca" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p id="filters-bar-period" className={labelClass}>
            Período
          </p>
          <div
            role="group"
            aria-labelledby="filters-bar-period"
            className="flex flex-wrap gap-0.5 rounded-lg border border-edge p-0.5"
          >
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={!showCustom && filters.preset === preset}
                onClick={() => choosePreset(preset)}
                className={segmentClass(!showCustom && filters.preset === preset)}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={showCustom}
              aria-expanded={showCustom}
              aria-controls="filters-bar-custom"
              onClick={() => setCustomOpen(true)}
              className={segmentClass(showCustom)}
            >
              <CalendarRange className="size-4" aria-hidden="true" />
              {PRESET_LABELS.custom}
            </button>
          </div>
        </div>

        {showCustom ? (
          <form id="filters-bar-custom" onSubmit={submitCustom} noValidate className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="filters-bar-from" className={labelClass}>
                Data inicial
              </label>
              <input
                id="filters-bar-from"
                type="date"
                value={draft.from}
                max={draft.to || maxDay}
                onChange={(e) => setDraft((current) => ({ ...current, from: e.target.value }))}
                aria-invalid={draftError ? true : undefined}
                aria-describedby={draftError ? 'filters-bar-custom-error' : undefined}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="filters-bar-to" className={labelClass}>
                Data final
              </label>
              <input
                id="filters-bar-to"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                max={maxDay}
                onChange={(e) => setDraft((current) => ({ ...current, to: e.target.value }))}
                aria-invalid={draftError ? true : undefined}
                aria-describedby={draftError ? 'filters-bar-custom-error' : undefined}
                className={fieldClass}
              />
            </div>
            <button
              type="submit"
              disabled={draftApplied}
              className="inline-flex h-10 items-center rounded-lg bg-lime-400 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:cursor-default disabled:bg-zinc-800 disabled:text-zinc-400"
            >
              {draftApplied ? 'Período aplicado' : 'Aplicar período'}
            </button>
          </form>
        ) : null}

        <div className="min-w-[220px] flex-1 lg:ml-auto lg:max-w-sm">
          <label htmlFor="filters-bar-search" className={labelClass}>
            Buscar serviço por nome
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
              aria-hidden="true"
            />
            <input
              id="filters-bar-search"
              type="search"
              value={text}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: billing-api"
              autoComplete="off"
              className={cn(fieldClass, 'w-full pl-9')}
            />
          </div>
        </div>
      </div>

      {draftError ? (
        <p id="filters-bar-custom-error" role="alert" className="flex items-center gap-1.5 text-xs text-state-down">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {draftError}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-orange-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Não foi possível atualizar a energia e o CO₂e do período ({error}). Uma nova tentativa acontece na próxima
          atualização.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-400">
          {loading ? <LoaderCircle className="size-3.5 animate-spin text-lime-400" aria-hidden="true" /> : null}
          <span>
            {loading ? 'Atualizando para' : 'Período aplicado:'}{' '}
            <span className="font-medium text-zinc-200">{periodLabel}</span>.
          </span>
          {filters.search ? (
            <span>
              Busca por <span className="font-medium text-zinc-200">“{filters.search}”</span>.
            </span>
          ) : null}
          {showCount ? (
            <span>
              {resultCount} de {totalCount} serviços exibidos.
            </span>
          ) : null}
        </p>
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-lime-400/40 hover:text-zinc-50"
          >
            <X className="size-3.5" aria-hidden="true" />
            Limpar período e busca
          </button>
        ) : null}
      </div>
    </GlassCard>
  )
}
