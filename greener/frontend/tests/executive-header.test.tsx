import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExecutiveHeaderView, type ExecutiveHeaderViewProps } from '@/components/dashboard/executive-header'
import {
  initialSummaryState,
  summaryFailed,
  summaryLoaded,
  summaryRequested,
} from '@/hooks/use-public-summary'
import { formatMeasure, formatShare } from '@/lib/format'
import { deriveSummary, parsePublicSummary, type SummaryResult } from '@/services/summary'
import { snapshot } from './fixtures'

const apiResponse = {
  energy_kwh: 1234.5,
  co2e_kg: 0.004567,
  services: { total: 5, active: 3, unavailable: 1, no_metrics: 1 },
  last_collection_at: '2026-11-02T12:00:00.000Z',
}

const result: SummaryResult = { summary: parsePublicSummary(apiResponse), source: 'api' }

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
  it('aceita números enviados como texto pelo PostgreSQL', () => {
    const parsed = parsePublicSummary({ ...apiResponse, energy_kwh: '2.5', co2e_kg: '1' })
    expect(parsed.energy_kwh).toBe(2.5)
    expect(parsed.co2e_kg).toBe(1)
  })

  it('rejeita respostas fora do contrato em vez de inventar zeros', () => {
    expect(() => parsePublicSummary({ ...apiResponse, energy_kwh: null })).toThrow()
    expect(() => parsePublicSummary({ ...apiResponse, services: { ...apiResponse.services, active: 9 } })).toThrow()
    expect(() => parsePublicSummary({ ...apiResponse, last_collection_at: 'ontem' })).toThrow()
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
      energy_kwh: 0,
      co2e_kg: 0,
      services: { total: 0, active: 0, unavailable: 0, no_metrics: 0 },
      last_collection_at: null,
    })
    const html = render({ data: { summary: empty, source: 'api' } })
    expect(html).toContain('role="status"')
    expect(html).toContain('Ainda não há serviços nem coletas')
  })

  it('serviços sem coleta: energia e emissão aparecem como "—", nunca zero', () => {
    const noCollection = parsePublicSummary({ ...apiResponse, last_collection_at: null })
    const html = render({ data: { summary: noCollection, source: 'api' } })
    expect(html).toContain('Nenhuma coleta registrada ainda')
    expect(html).not.toContain('1.234,5')
  })
})