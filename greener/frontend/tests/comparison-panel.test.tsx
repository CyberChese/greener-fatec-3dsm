// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BackendComparisonResult } from '@/services/backend-services'
import * as backendServices from '@/services/backend-services'
import { ComparisonChartTooltip, ComparisonPanel } from '@/components/dashboard/comparison-panel'
import type { ComparisonPoint } from '@/components/dashboard/comparison-data'
import { record, snapshot } from './fixtures'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const services = [
  snapshot({ id: 'alpha', backendId: 'uuid-alpha', name: 'Alpha' }),
  snapshot({ id: 'beta', backendId: 'uuid-beta', name: 'Beta' }),
]
const history = [
  record({ serviceId: 'alpha', serviceName: 'Alpha', energyKwh: 0.002, co2eKg: 0.0002 }),
  record({ serviceId: 'beta', serviceName: 'Beta', energyKwh: 0.004, co2eKg: 0.0004 }),
]

function renderPanel(overrides: Partial<Parameters<typeof ComparisonPanel>[0]> = {}) {
  return render(
    <ComparisonPanel
      services={services}
      periodTotals={new Map()}
      periodLabel="sessão"
      simulatedHistory={history}
      simulated
      onRemove={() => {}}
      onClear={() => {}}
      {...overrides}
    />,
  )
}

describe('painel de comparação direta (TASK-044 / TASK-050)', () => {
  it('exibe orientação quando menos de dois serviços estão selecionados', () => {
    renderPanel({ services: [services[0]] })
    expect(screen.getByText(/Marque pelo menos dois serviços na lista acima/)).toBeTruthy()
  })

  it('exibe gráficos de energia e emissões e permite alternar a visibilidade pela legenda', () => {
    renderPanel()

    expect(screen.getByRole('region', { name: 'Evolução do consumo energético' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Evolução das emissões' })).toBeTruthy()
    const alphaLegend = screen.getByRole('button', { name: 'Visibilidade de Alpha' })
    expect(alphaLegend.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(alphaLegend)
    expect(alphaLegend.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(alphaLegend)
    expect(alphaLegend.getAttribute('aria-pressed')).toBe('true')
  })

  it('mostra o resumo percentual de economia com os serviços mais e menos eficientes', () => {
    renderPanel()

    const summary = screen.getByRole('region', { name: 'Economia de emissões entre os serviços comparados' })
    expect(summary.querySelector('strong')?.textContent).toBe('50,0%')
    expect(summary.textContent).toContain('Alpha')
    expect(summary.textContent).toContain('Beta')
  })

  it('aciona onRemove e onClear pelos controles do painel', () => {
    const onRemove = vi.fn()
    const onClear = vi.fn()
    renderPanel({ onRemove, onClear })

    fireEvent.click(screen.getByRole('button', { name: 'Remover Alpha da comparação' }))
    expect(onRemove).toHaveBeenCalledWith('alpha')

    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('exibe mensagem vazia quando não há coletas para os serviços selecionados', () => {
    renderPanel({ simulatedHistory: [] })

    expect(screen.getByText(/Nenhuma coleta com energia ou emissão disponível/)).toBeTruthy()
    expect(screen.getByText(/Sem medições de energia suficientes/)).toBeTruthy()
  })

  it('integra modo API real com 3 serviços incluindo UNAVAILABLE e exibe resumo do backend', async () => {
    const gamma = snapshot({ id: 'gamma', backendId: 'uuid-gamma', name: 'Gamma', status: 'unavailable' })
    const comparisonPayload: BackendComparisonResult = {
      startDate: '2026-11-16T12:00:00.000Z',
      endDate: '2026-11-16T12:05:00.000Z',
      bucketSeconds: 30,
      services: [
        {
          service_id: 'uuid-alpha',
          external_id: 'alpha',
          name: 'Alpha',
          status: 'ACTIVE',
          samples_count: 2,
          avg_cpu_usage: 30,
          total_energy_kwh: 0.002,
          total_co2e_kg: 0.0002,
        },
        {
          service_id: 'uuid-beta',
          external_id: 'beta',
          name: 'Beta',
          status: 'ACTIVE',
          samples_count: 2,
          avg_cpu_usage: 75,
          total_energy_kwh: 0.008,
          total_co2e_kg: 0.001,
        },
        {
          service_id: 'uuid-gamma',
          external_id: 'gamma',
          name: 'Gamma',
          status: 'UNAVAILABLE',
          samples_count: 0,
          avg_cpu_usage: null,
          total_energy_kwh: 0,
          total_co2e_kg: 0,
        },
      ],
      series: [
        {
          timestamp: '2026-11-16T12:00:00.000Z',
          values: {
            'uuid-alpha': { cpu_usage: 30, energy_kwh: 0.001, co2e_kg: 0.0001 },
            'uuid-beta': { cpu_usage: 75, energy_kwh: 0.004, co2e_kg: 0.0005 },
            'uuid-gamma': { cpu_usage: null, energy_kwh: null, co2e_kg: null },
          },
        },
      ],
      summary: {
        most_polluting_service_id: 'uuid-beta',
        least_polluting_service_id: 'uuid-alpha',
        most_polluting_co2e_kg: 0.001,
        least_polluting_co2e_kg: 0.0002,
        co2e_difference_kg: 0.0008,
        efficiency_difference_percent: 80,
      },
    }

    vi.spyOn(backendServices, 'fetchServiceComparison').mockResolvedValue(comparisonPayload)

    renderPanel({
      services: [...services, gamma],
      simulated: false,
      simulatedHistory: [],
      periodTotals: new Map([
        ['alpha', { energyKwh: 0.002, co2eKg: 0.0002 }],
        ['beta', { energyKwh: 0.008, co2eKg: 0.001 }],
      ]),
      periodLabel: 'últimos 7 dias',
    })

    expect(screen.getByRole('status').textContent).toContain('Carregando histórico')

    await waitFor(() => {
      const summary = screen.getByRole('region', { name: 'Economia de emissões entre os serviços comparados' })
      expect(summary.querySelector('strong')?.textContent).toBe('80,0%')
    })

    expect(screen.getByText('3 serviços · mesmo período, mesmas unidades')).toBeTruthy()
    expect(screen.getByText('Serviço Indisponível')).toBeTruthy()
  })

  it('exibe alerta quando a API de comparação falha no modo real', async () => {
    vi.spyOn(backendServices, 'fetchServiceComparison').mockRejectedValue(new Error('HTTP 503'))

    renderPanel({
      simulated: false,
      simulatedHistory: [],
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('HTTP 503')
    })
  })

  it('mostra todos os serviços no tooltip unificado para energia e CO2e, e retorna vazio quando inativo', () => {
    const point: ComparisonPoint = {
      timestamp: Date.parse('2026-10-10T12:00:00.000Z'),
      values: {
        alpha: { energyKwh: 0.002, co2eKg: 0.0002 },
        beta: { energyKwh: null, co2eKg: 0.0004 },
      },
    }

    const { rerender, container } = render(
      <ComparisonChartTooltip
        active
        payload={[{ payload: point }]}
        services={services}
        metric="energyKwh"
      />,
    )

    expect(screen.getByRole('tooltip').textContent).toContain('Alpha')
    expect(screen.getByRole('tooltip').textContent).toContain('Beta')
    expect(screen.getByRole('tooltip').textContent).toContain('0,002 kWh')
    expect(screen.getByRole('tooltip').textContent).toContain('—')

    rerender(
      <ComparisonChartTooltip
        active
        payload={[{ payload: point }]}
        services={services}
        metric="co2eKg"
      />,
    )
    expect(screen.getByRole('tooltip').textContent).toContain('kgCO₂e')

    rerender(
      <ComparisonChartTooltip
        active={false}
        payload={[{ payload: point }]}
        services={services}
        metric="co2eKg"
      />,
    )
    expect(container.textContent).toBe('')
  })
})
