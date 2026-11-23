import { describe, expect, it } from 'vitest'
import { comparisonWindow } from '@/hooks/use-service-comparison'
import { totalsInRange } from '@/lib/calculations'
import {
  DEFAULT_FILTERS,
  SEARCH_DEBOUNCE_MS,
  describePeriod,
  hasActiveFilters,
  matchesSearch,
  parseDateInput,
  parseTimeFilters,
  rangeKey,
  resolveRange,
  validateCustomRange,
  writeTimeFilters,
} from '@/lib/dashboard-filters'
import { record, snapshot } from './fixtures'

const parse = (query: string) => parseTimeFilters(new URLSearchParams(query))
const NOW = new Date(2026, 10, 16, 12, 0, 0).getTime()
const DAY = 24 * 60 * 60_000

describe('filtros na URL (TASK-045)', () => {
  it('sem parâmetros usa o período padrão e busca vazia', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS)
    expect(DEFAULT_FILTERS.preset).toBe('7d')
  })

  it('lê os atalhos rápidos e a busca', () => {
    expect(parse('period=24h&q=billing')).toEqual({ preset: '24h', from: null, to: null, search: 'billing' })
    expect(parse('period=30d').preset).toBe('30d')
  })

  it('lê o período personalizado com as duas datas', () => {
    expect(parse('period=custom&from=2026-11-01&to=2026-11-10')).toEqual({
      preset: 'custom',
      from: '2026-11-01',
      to: '2026-11-10',
      search: '',
    })
  })

  it('volta ao padrão quando o link traz valores inválidos, mantendo a busca', () => {
    expect(parse('period=ontem&q=api')).toEqual({ ...DEFAULT_FILTERS, search: 'api' })
    expect(parse('period=custom&from=2026-11-10&to=2026-11-01').preset).toBe('7d')
    expect(parse('period=custom&from=2026-02-31&to=2026-03-01').preset).toBe('7d')
    expect(parse('period=custom&from=2026-11-01').preset).toBe('7d')
  })

  it('apara e limita o texto da busca', () => {
    expect(parse('q=%20%20auth%20').search).toBe('auth')
    expect(parse(`q=${'a'.repeat(200)}`).search).toHaveLength(80)
  })

  it('grava só o que difere do padrão e preserva parâmetros de outras telas', () => {
    const base = new URLSearchParams('aba=cartoes&period=24h&q=velho')
    expect(writeTimeFilters(base, DEFAULT_FILTERS).toString()).toBe('aba=cartoes')
    expect(writeTimeFilters(base, { preset: '30d', from: null, to: null, search: ' billing ' }).toString()).toBe(
      'aba=cartoes&period=30d&q=billing',
    )
    expect(
      writeTimeFilters(new URLSearchParams(), { preset: 'custom', from: '2026-11-01', to: '2026-11-10', search: '' }).toString(),
    ).toBe('period=custom&from=2026-11-01&to=2026-11-10')
  })

  it('o link gerado reproduz o mesmo estado ao ser aberto', () => {
    const filters = { preset: 'custom' as const, from: '2026-10-01', to: '2026-10-31', search: 'search-api' }
    expect(parseTimeFilters(writeTimeFilters(new URLSearchParams(), filters))).toEqual(filters)
  })
})

describe('janela temporal (TASK-045)', () => {
  it('os atalhos terminam no instante atual', () => {
    const day = resolveRange({ ...DEFAULT_FILTERS, preset: '24h' }, NOW)
    expect(day.to.getTime()).toBe(NOW)
    expect(day.from.getTime()).toBe(NOW - DAY)
    expect(resolveRange(DEFAULT_FILTERS, NOW).from.getTime()).toBe(NOW - 7 * DAY)
    expect(resolveRange({ ...DEFAULT_FILTERS, preset: '30d' }, NOW).from.getTime()).toBe(NOW - 30 * DAY)
  })

  it('o período personalizado cobre do início do primeiro dia ao fim do último', () => {
    const range = resolveRange({ preset: 'custom', from: '2026-11-01', to: '2026-11-10', search: '' }, NOW)
    expect(range.from).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0))
    expect(range.to).toEqual(new Date(2026, 10, 10, 23, 59, 59, 999))
  })

  it('valida as datas antes de aplicar', () => {
    expect(validateCustomRange('2026-11-01', '2026-11-10', '2026-11-16')).toBeNull()
    expect(validateCustomRange('2026-11-10', '2026-11-10', '2026-11-16')).toBeNull()
    expect(validateCustomRange('', '2026-11-10')).toContain('Informe')
    expect(validateCustomRange('2026-11-10', '2026-11-01')).toContain('anterior')
    expect(validateCustomRange('2026-13-01', '2026-13-02')).toContain('válidas')
    expect(validateCustomRange('2026-11-20', '2026-11-21', '2026-11-16')).toContain('futuro')
    expect(parseDateInput('2026-02-30')).toBeNull()
  })

  it('descreve o período em texto e distingue janelas diferentes', () => {
    expect(describePeriod({ ...DEFAULT_FILTERS, preset: '24h' })).toBe('últimas 24 horas')
    expect(describePeriod(DEFAULT_FILTERS)).toBe('últimos 7 dias')
    expect(describePeriod({ preset: 'custom', from: '2026-11-01', to: '2026-11-10', search: '' })).toBe(
      'de 01/11/2026 a 10/11/2026',
    )
    expect(describePeriod({ preset: 'custom', from: '2026-11-01', to: '2026-11-01', search: '' })).toBe('dia 01/11/2026')
    expect(rangeKey(DEFAULT_FILTERS)).not.toBe(rangeKey({ ...DEFAULT_FILTERS, preset: '24h' }))
    expect(rangeKey({ ...DEFAULT_FILTERS, search: 'x' })).toBe(rangeKey(DEFAULT_FILTERS))
  })

  it('sabe quando há filtro diferente do padrão', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'api' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, preset: '30d' })).toBe(true)
  })

  it('soma só as coletas dentro da janela (modo de demonstração)', () => {
    const at = (iso: string) => Date.parse(iso)
    const totals = totalsInRange(
      [
        record({ id: '1', simulatedAt: '2026-10-10T10:00:00.000Z', energyKwh: 1, co2eKg: 0.1 }),
        record({ id: '2', simulatedAt: '2026-10-10T12:00:00.000Z', energyKwh: 2, co2eKg: 0.2 }),
        record({ id: '3', simulatedAt: '2026-10-10T14:00:00.000Z', energyKwh: 4, co2eKg: 0.4 }),
      ],
      at('2026-10-10T11:00:00.000Z'),
      at('2026-10-10T14:00:00.000Z'),
    )
    expect(totals.get('svc')?.energyKwh).toBe(6)
    expect(totals.get('svc')?.co2eKg).toBeCloseTo(0.6)
  })
})

describe('comparação acompanha o período (TASK-045)', () => {
  it('sem filtros mantém a janela de 15 min com blocos de 30 s', () => {
    expect(comparisonWindow(undefined, NOW)).toEqual({
      startDate: new Date(NOW - 15 * 60_000).toISOString(),
      bucketSeconds: 30,
    })
  })

  it('usa a janela selecionada e aumenta os blocos para no máximo 120 pontos', () => {
    const week = comparisonWindow(DEFAULT_FILTERS, NOW)
    expect(week.startDate).toBe(new Date(NOW - 7 * DAY).toISOString())
    expect(week.endDate).toBe(new Date(NOW).toISOString())
    expect(week.bucketSeconds).toBe((7 * DAY) / 1000 / 120)
    expect(comparisonWindow({ ...DEFAULT_FILTERS, preset: '24h' }, NOW).bucketSeconds).toBe(720)
  })
})

describe('busca por nome de serviço (TASK-045)', () => {
  const billing = snapshot({ id: 'billing-api', name: 'Billing API' })

  it('ignora maiúsculas e espaços nas pontas', () => {
    expect(matchesSearch(billing, '  BILLING ')).toBe(true)
    expect(matchesSearch(billing, 'auth')).toBe(false)
    expect(matchesSearch(billing, '')).toBe(true)
  })

  it('encontra países pelo nome localizado', () => {
    expect(matchesSearch(snapshot({ location: { ...billing.location, country: 'Brazil' } }), 'Brasil')).toBe(true)
  })

  it('o debounce da busca é de 300 ms', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300)
  })
})
