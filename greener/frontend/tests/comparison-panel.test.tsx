// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ComparisonChartTooltip, ComparisonPanel } from '@/components/dashboard/comparison-panel'
import type { ComparisonPoint } from '@/components/dashboard/comparison-data'
import { record, snapshot } from './fixtures'

afterEach(cleanup)

const services = [
  snapshot({ id: 'alpha', name: 'Alpha' }),
  snapshot({ id: 'beta', name: 'Beta' }),
]
const history = [
  record({ serviceId: 'alpha', serviceName: 'Alpha', energyKwh: 0.002, co2eKg: 0.0002 }),
  record({ serviceId: 'beta', serviceName: 'Beta', energyKwh: 0.004, co2eKg: 0.0004 }),
]

function renderPanel() {
  return render(
    <ComparisonPanel
      services={services}
      periodTotals={new Map()}
      periodLabel="sessão"
      simulatedHistory={history}
      simulated
      onRemove={() => {}}
      onClear={() => {}}
    />,
  )
}

describe('painel de comparação direta (TASK-044)', () => {
  it('exibe gráficos de energia e emissões e permite alternar a visibilidade pela legenda', () => {
    renderPanel()

    expect(screen.getByRole('region', { name: 'Evolução do consumo energético' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Evolução das emissões' })).toBeTruthy()
    const alphaLegend = screen.getByRole('button', { name: 'Visibilidade de Alpha' })
    expect(alphaLegend.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(alphaLegend)
    expect(alphaLegend.getAttribute('aria-pressed')).toBe('false')
  })

  it('mostra o resumo percentual de economia com os serviços mais e menos eficientes', () => {
    renderPanel()

    const summary = screen.getByRole('region', { name: 'Economia de emissões entre os serviços comparados' })
    expect(summary.querySelector('strong')?.textContent).toBe('50,0%')
    expect(summary.textContent).toContain('Alpha')
    expect(summary.textContent).toContain('Beta')
  })

  it('mostra todos os serviços no tooltip unificado para o instante selecionado', () => {
    const point: ComparisonPoint = {
      timestamp: Date.parse('2026-10-10T12:00:00.000Z'),
      values: {
        alpha: { energyKwh: 0.002, co2eKg: 0.0002 },
        beta: { energyKwh: null, co2eKg: 0.0004 },
      },
    }

    render(
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
  })
})
