import type { AxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicApi } from '@/services/http'
import { combineTotals, fetchPeriodTotals, parseRankingPage, sumTotals } from '@/services/ranking'

const page = (items: unknown[], totalPages = 1) => ({
  metric: 'co2e',
  order: 'desc',
  startDate: null,
  endDate: null,
  items,
  pagination: { page: 1, limit: 100, total: items.length, totalPages },
})

const item = (external_id: string, metric_value: number | string) => ({
  rank: 1,
  service_id: `uuid-${external_id}`,
  external_id,
  name: external_id,
  status: 'ACTIVE',
  metric_value,
})

const param = (config: AxiosRequestConfig | undefined, name: string) =>
  (config?.params as Record<string, unknown> | undefined)?.[name]

const range = { from: new Date('2026-11-09T12:00:00.000Z'), to: new Date('2026-11-16T12:00:00.000Z') }

describe('totais do período pelo ranking do backend (TASK-045)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('valida o formato de GET /metrics/ranking', () => {
    expect(parseRankingPage(page([item('a', '1.5')])).items).toEqual([{ id: 'a', value: 1.5 }])
    expect(() => parseRankingPage({ items: [] })).toThrow()
    expect(() => parseRankingPage(page([{ external_id: 'a' }]))).toThrow()
    expect(() => parseRankingPage(null)).toThrow()
  })

  it('usa o id interno quando o serviço não tem external_id', () => {
    expect(parseRankingPage(page([{ ...item('', 2), service_id: 'uuid-x' }])).items).toEqual([{ id: 'uuid-x', value: 2 }])
  })

  it('serviço sem medição no período fica fora dos totais em vez de valer zero', () => {
    const totals = combineTotals(
      new Map([
        ['a', 2],
        ['b', 0],
        ['c', 1],
      ]),
      new Map([
        ['a', 0.5],
        ['b', 0],
      ]),
    )
    expect([...totals.keys()]).toEqual(['a'])
    expect(totals.get('a')).toEqual({ energyKwh: 2, co2eKg: 0.5, samples: 0 })
    expect(sumTotals(totals)).toEqual({ energyKwh: 2, co2eKg: 0.5 })
  })

  it('consulta energia e CO₂e com a janela selecionada', async () => {
    const get = vi.spyOn(publicApi, 'get').mockImplementation((_url: string, config?: AxiosRequestConfig) =>
      Promise.resolve({
        data: param(config, 'metric') === 'energy' ? page([item('a', 3), item('b', 1)]) : page([item('a', 0.6), item('b', 0.2)]),
      }),
    )

    const totals = await fetchPeriodTotals(range)

    expect(totals.get('a')).toEqual({ energyKwh: 3, co2eKg: 0.6, samples: 0 })
    expect(totals.get('b')).toEqual({ energyKwh: 1, co2eKg: 0.2, samples: 0 })
    expect(get).toHaveBeenCalledTimes(2)
    for (const call of get.mock.calls) {
      expect(call[0]).toBe('/metrics/ranking')
      expect(call[1]?.params).toMatchObject({
        startDate: '2026-11-09T12:00:00.000Z',
        endDate: '2026-11-16T12:00:00.000Z',
        page: 1,
        limit: 100,
      })
    }
  })

  it('percorre todas as páginas do ranking', async () => {
    const get = vi.spyOn(publicApi, 'get').mockImplementation((_url: string, config?: AxiosRequestConfig) =>
      Promise.resolve({ data: param(config, 'page') === 1 ? page([item('a', 1)], 2) : page([item('b', 2)], 2) }),
    )

    const totals = await fetchPeriodTotals(range)

    expect([...totals.keys()].sort()).toEqual(['a', 'b'])
    expect(get).toHaveBeenCalledTimes(4)
  })
})
