import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ExecutiveHeaderView, type ExecutiveHeaderViewProps } from '@/components/dashboard/executive-header'
import {
  initialSummaryState,
  summaryFailed,
  summaryLoaded,
  summaryRequested,
} from '@/hooks/use-public-summary'
import { formatMeasure, formatShare } from '@/lib/format'
import { publicApi } from '@/services/http'
import { deriveSummary, fetchPublicSummary, parsePublicSummary, type SummaryResult } from '@/services/summary'
import { snapshot } from './fixtures'

/** Formato real de GET /api/metrics/summary (backend). */
const apiResponse = {
  total_energy_kwh: 1234.5,
  total_co2e_kg: 0.004567,
  services_count: { active: 3, unavailable: 1, no_metrics: 1 },
}
const LAST_COLLECTION = '2026-11-02T12:00:00.000Z'

const result: SummaryResult = { summary: parsePublicSummary(apiResponse, LAST_COLLECTION), source: 'api' }

const render = (props: Partial<ExecutiveHeaderViewProps>) =>
  renderToStaticMarkup(
    <ExecutiveHeaderView data={null} updatedAt={null} error={null} initialLoading={false} {...props} />,
  )

describe('formatação pt-BR (TASK-024)', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(formatMeasure(1234.5)).toBe('1.234,5')
    expect(formatMeasure(12.3456)).toBe('12,35')
    expect(formatMeasure(0.004567)).toBe('0,00457')
    expect(formatMeasure(0)).toBe('0')
    expect(formatMeasure(null)).toBe('—')
  })

  it('formata a proporção como porcentagem', () => {
    expect(formatShare(3, 5).replace(/\s/g, '')).toBe('60%')
    expect(formatShare(0, 0)).toBe('—')
  })
})

describe('parsePublicSummary', () => {
  it('converte o formato real do backend e calcula o total de serviços', () => {
    const parsed = parsePublicSummary(
      {
        total_energy_kwh: 0.04692212,
        total_co2e_kg: 0.01007074489,
        services_count: { active: 7, unavailable: 1, no_metrics: 0 },
      },
      LAST_COLLECTION,
    )
    expect(parsed.energy_kwh).toBe(0.04692212)
    expect(parsed.co2e_kg).toBe(0.01007074489)
    expect(parsed.services).toEqual({ total: 8, active: 7, unavailable: 1, no_metrics: 0 })
    expect(parsed.last_collection_at).toBe(LAST_COLLECTION)
  })

  it('sem horário de coleta, mantém last_collection_at nulo', () => {
    expect(parsePublicSummary(apiResponse).last_collection_at).toBeNull()
  })

  it('aceita números enviados como texto pelo PostgreSQL', () => {
    const parsed = parsePublicSummary({ ...apiResponse, total_energy_kwh: '2.5', total_co2e_kg: '1' })
    expect(parsed.energy_kwh).toBe(2.5)
    expect(parsed.co2e_kg).toBe(1)
  })

  it('rejeita respostas fora do contrato em vez de inventar zeros', () => {
    expect(() => parsePublicSummary({ ...apiResponse, total_energy_kwh: null })).toThrow()
    expect(() => parsePublicSummary({ ...apiResponse, total_co2e_kg: -1 })).toThrow()
    expect(() => parsePublicSummary({ ...apiResponse, services_count: { active: 1, unavailable: 0 } })).toThrow()
    expect(() => parsePublicSummary({ ...apiResponse, services_count: { active: 1.5, unavailable: 0, no_metrics: 0 } })).toThrow()
    expect(() => parsePublicSummary({ total_energy_kwh: 1, total_co2e_kg: 1 })).toThrow()
    expect(() => parsePublicSummary(apiResponse, 'ontem')).toThrow()
  })

  it('rejeita o formato antigo suposto antes do endpoint existir', () => {
    expect(() =>
      parsePublicSummary({
        energy_kwh: 1,
        co2e_kg: 1,
        services: { total: 1, active: 1, unavailable: 0, no_metrics: 0 },
      }),
    ).toThrow()
  })
})

describe('fetchPublicSummary', () => {
  it('combina o resumo do backend com o horário da última coleta', async () => {
    const get = vi.spyOn(publicApi, 'get').mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === '/metrics/summary'
            ? apiResponse
            : { interval_seconds: 30, last_collection_at: LAST_COLLECTION },
      }),
    )
    const fetched = await fetchPublicSummary()
    expect(fetched.source).toBe('api')
    expect(fetched.summary.services.total).toBe(5)
    expect(fetched.summary.last_collection_at).toBe(LAST_COLLECTION)
    expect(get).toHaveBeenCalledWith('/metrics/summary', expect.anything())
    expect(get).toHaveBeenCalledWith('/metrics/collection-config', expect.anything())
    get.mockRestore()
  })

  it('falha com mensagem clara quando o backend devolve um resumo inválido', async () => {
    const get = vi.spyOn(publicApi, 'get').mockImplementation((url: string) =>
      Promise.resolve({
        data: url === '/metrics/summary' ? { energy_kwh: 1 } : { interval_seconds: 30, last_collection_at: null },
      }),
    )
    await expect(fetchPublicSummary()).rejects.toThrow('resumo de indicadores inválido')
    get.mockRestore()
  })
})

describe('deriveSummary (enquanto a TASK-023 não existe)', () => {
  it('soma energia e converte CO₂e de gramas para kg, ignorando coletas sem valor', () => {
    const summary = deriveSummary(
      [snapshot({ id: 'a', status: 'active' }), snapshot({ id: 'b', status: 'unavailable' })],
      [
        { idCollections: '1', service_id: 'a', cpu_usage: 1, memory_usage: 1, storage_usage: 1, network_io: 1, timestamp: '2026-11-02T11:00:00.000Z', energy_kwh: '0.5', co2e_g: '200' },
        { idCollections: '2', service_id: 'a', cpu_usage: 1, memory_usage: 1, storage_usage: 1, network_io: 1, timestamp: '2026-11-02T11:30:00.000Z', energy_kwh: 0.25, co2e_g: null },
      ],
      { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
    )
    expect(summary.energy_kwh).toBe(0.75)
    expect(summary.co2e_kg).toBe(0.2)
    expect(summary.services).toEqual({ total: 2, active: 1, unavailable: 1, no_metrics: 0 })
    expect(summary.last_collection_at).toBe('2026-11-02T11:30:00.000Z')
  })
})

describe('estado do resumo', () => {
  it('skeleton só no primeiro carregamento; atualização preserva os valores', () => {
    const loaded = summaryLoaded(initialSummaryState, result, '2026-11-02T12:00:00.000Z')
    expect(loaded.initialLoading).toBe(false)
    const refreshing = summaryRequested(loaded)
    expect(refreshing.initialLoading).toBe(false)
    expect(refreshing.refreshing).toBe(true)
    expect(refreshing.data).toBe(result)
  })

  it('erro de rede não apaga os dados anteriores', () => {
    const loaded = summaryLoaded(initialSummaryState, result, '2026-11-02T12:00:00.000Z')
    const failed = summaryFailed(summaryRequested(loaded), 'Não foi possível conectar à API.')
    expect(failed.data).toBe(result)
    expect(failed.updatedAt).toBe('2026-11-02T12:00:00.000Z')
    expect(failed.error).toBe('Não foi possível conectar à API.')
  })
})

describe('ExecutiveHeaderView', () => {
  it('mostra o skeleton no primeiro carregamento', () => {
    const html = render({ initialLoading: true })
    expect(html).toContain('Carregando indicadores consolidados')
    expect(html).toContain('animate-pulse')
  })

  it('mostra valores e unidades da API em pt-BR', () => {
    const html = render({ data: result, updatedAt: '2026-11-02T12:00:00.000Z' })
    expect(html).toContain('1.234,5')
    expect(html).toContain('kWh')
    expect(html).toContain('0,00457')
    expect(html).toContain('kg CO₂e')
    expect(html).toContain('3 de 5 serviços ativos')
    expect(html).not.toContain('animate-pulse')
  })

  it('não mostra skeleton durante uma atualização', () => {
    const html = render({ data: result, updatedAt: '2026-11-02T12:00:00.000Z', refreshing: true })
    expect(html).not.toContain('animate-pulse')
    expect(html).toContain('1.234,5')
    expect(html).toContain('aria-busy="true"')
  })

  it('erro de rede com dados anteriores: avisa e mantém os valores', () => {
    const html = render({ data: result, updatedAt: '2026-11-02T12:00:00.000Z', error: 'Não foi possível conectar à API.' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('Falha ao atualizar os indicadores')
    expect(html).toContain('1.234,5')
  })

  it('erro sem dados: avisa sem quebrar e oferece nova tentativa', () => {
    const html = render({ error: 'A API demorou demais para responder.', onRetry: () => {} })
    expect(html).toContain('role="alert"')
    expect(html).toContain('Tentar novamente')
  })

  it('sem dados: estado vazio acessível', () => {
    const empty = parsePublicSummary({
      total_energy_kwh: 0,
      total_co2e_kg: 0,
      services_count: { active: 0, unavailable: 0, no_metrics: 0 },
    })
    const html = render({ data: { summary: empty, source: 'api' } })
    expect(html).toContain('role="status"')
    expect(html).toContain('Ainda não há serviços nem coletas')
  })

  it('serviços sem coleta: energia e emissão aparecem como "—", nunca zero', () => {
    const noCollection = parsePublicSummary(apiResponse, null)
    const html = render({ data: { summary: noCollection, source: 'api' } })
    expect(html).toContain('Nenhuma coleta registrada ainda')
    expect(html).not.toContain('1.234,5')
  })
})