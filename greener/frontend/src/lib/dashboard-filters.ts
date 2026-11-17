import type { ServiceSnapshot } from './types'

export const QUICK_PRESETS = ['24h', '7d', '30d'] as const

export type QuickPreset = (typeof QUICK_PRESETS)[number]

export type TimePreset = QuickPreset | 'custom'

export interface TimeFilters {
  preset: TimePreset
  from: string | null
  to: string | null
  search: string
}

export interface TimeRange {
  from: Date
  to: Date
}

export const DEFAULT_PRESET: QuickPreset = '7d'

export const SEARCH_DEBOUNCE_MS = 300

export const SEARCH_MAX_LENGTH = 80

export const FILTER_PARAMS = { preset: 'period', from: 'from', to: 'to', search: 'q' } as const

const DAY_MS = 24 * 60 * 60_000

export const PRESET_DURATION_MS: Record<QuickPreset, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
}

export const PRESET_LABELS: Record<TimePreset, string> = {
  '24h': 'Últimas 24h',
  '7d': 'Últimos 7 dias',
  '30d': '30 dias',
  custom: 'Personalizado',
}

const PRESET_DESCRIPTIONS: Record<QuickPreset, string> = {
  '24h': 'últimas 24 horas',
  '7d': 'últimos 7 dias',
  '30d': 'últimos 30 dias',
}

export const DEFAULT_FILTERS: TimeFilters = { preset: DEFAULT_PRESET, from: null, to: null, search: '' }

const isQuickPreset = (value: string | null): value is QuickPreset =>
  value !== null && (QUICK_PRESETS as readonly string[]).includes(value)

export function parseDateInput(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function validateCustomRange(from: string | null, to: string | null, today?: string): string | null {
  if (!from || !to) return 'Informe a data inicial e a data final.'
  if (!parseDateInput(from) || !parseDateInput(to)) return 'Use datas válidas.'
  if (from > to) return 'A data inicial deve ser anterior ou igual à data final.'
  if (today && from > today) return 'A data inicial não pode estar no futuro.'
  return null
}

export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '').trim().slice(0, SEARCH_MAX_LENGTH)
}

export function parseTimeFilters(params: URLSearchParams): TimeFilters {
  const search = normalizeSearch(params.get(FILTER_PARAMS.search))
  const preset = params.get(FILTER_PARAMS.preset)

  if (preset === 'custom') {
    const from = params.get(FILTER_PARAMS.from)
    const to = params.get(FILTER_PARAMS.to)
    if (validateCustomRange(from, to) === null) return { preset: 'custom', from, to, search }
    return { ...DEFAULT_FILTERS, search }
  }

  return { preset: isQuickPreset(preset) ? preset : DEFAULT_PRESET, from: null, to: null, search }
}

export function writeTimeFilters(current: URLSearchParams, filters: TimeFilters): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const name of Object.values(FILTER_PARAMS)) next.delete(name)

  if (filters.preset === 'custom' && filters.from && filters.to) {
    next.set(FILTER_PARAMS.preset, 'custom')
    next.set(FILTER_PARAMS.from, filters.from)
    next.set(FILTER_PARAMS.to, filters.to)
  } else if (filters.preset !== 'custom' && filters.preset !== DEFAULT_PRESET) {
    next.set(FILTER_PARAMS.preset, filters.preset)
  }

  const search = normalizeSearch(filters.search)
  if (search) next.set(FILTER_PARAMS.search, search)
  return next
}

export function resolveRange(filters: TimeFilters, now: number): TimeRange {
  if (filters.preset === 'custom') {
    const from = parseDateInput(filters.from)
    const to = parseDateInput(filters.to)
    if (from && to) {
      return { from, to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) }
    }
    return { from: new Date(now - PRESET_DURATION_MS[DEFAULT_PRESET]), to: new Date(now) }
  }
  return { from: new Date(now - PRESET_DURATION_MS[filters.preset]), to: new Date(now) }
}

export function rangeKey(filters: TimeFilters): string {
  return filters.preset === 'custom' ? `custom:${filters.from}:${filters.to}` : filters.preset
}

const formatDateInput = (value: string) => value.split('-').reverse().join('/')

export function describePeriod(filters: TimeFilters): string {
  if (filters.preset !== 'custom') return PRESET_DESCRIPTIONS[filters.preset]
  if (!filters.from || !filters.to) return PRESET_DESCRIPTIONS[DEFAULT_PRESET]
  if (filters.from === filters.to) return `dia ${formatDateInput(filters.from)}`
  return `de ${formatDateInput(filters.from)} a ${formatDateInput(filters.to)}`
}

export function hasActiveFilters(filters: TimeFilters): boolean {
  return filters.preset !== DEFAULT_PRESET || filters.search !== ''
}

export function matchesSearch(service: ServiceSnapshot, search: string): boolean {
  const query = search.trim().toLowerCase()
  if (!query) return true
  const { location } = service
  return [service.name, service.id, location.country, location.region, location.city ?? '', location.region_code]
    .join(' ')
    .toLowerCase()
    .includes(query)
}
