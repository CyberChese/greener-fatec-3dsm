// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { comparisonWindow, useServiceComparison } from '@/hooks/use-service-comparison'
import type { TimeFilters } from '@/lib/dashboard-filters'
import type { ServiceSnapshot } from '@/lib/types'
import * as backendServices from '@/services/backend-services'
import type { BackendComparisonResult } from '@/services/backend-services'
import { snapshot } from './fixtures'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const services = [
  snapshot({ id: 'billing', backendId: 'uuid-billing', name: 'Billing' }),
  snapshot({ id: 'auth', backendId: 'uuid-auth', name: 'Auth' }),
]

const sampleResult: BackendComparisonResult = {
  startDate: '2026-11-16T11:00:00.000Z',
  endDate: '2026-11-16T12:00:00.000Z',
  bucketSeconds: 30,
  services: [],
  series: [],
  summary: {
    most_polluting_service_id: 'uuid-billing',
    least_polluting_service_id: 'uuid-auth',
    most_polluting_co2e_kg: 0.001,
    least_polluting_co2e_kg: 0.0004,
    co2e_difference_kg: 0.0006,
    efficiency_difference_percent: 60,
  },
}

function Harness({
  list,
  enabled = true,
  filters,
}: {
  list: ServiceSnapshot[]
  enabled?: boolean
  filters?: TimeFilters
}) {
  const { result, loading, error } = useServiceComparison(list, enabled, filters)
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="efficiency">{result?.summary.efficiency_difference_percent ?? ''}</span>
    </div>
  )
}

describe('useServiceComparison (TASK-044 / TASK-050)', () => {
  it('calcula janela padrão e bucketSeconds proporcional ao intervalo selecionado', () => {
    const now = Date.parse('2026-11-16T12:00:00.000Z')
    const defaultWindow = comparisonWindow(undefined, now)
    expect(defaultWindow.bucketSeconds).toBe(30)
    expect(defaultWindow.startDate).toBeDefined()

    const weekWindow = comparisonWindow({ preset: '7d', from: null, to: null, search: '' }, now)
    expect(weekWindow.startDate).toBe('2026-11-09T12:00:00.000Z')
    expect(weekWindow.endDate).toBe('2026-11-16T12:00:00.000Z')
    expect(weekWindow.bucketSeconds).toBe(Math.ceil((7 * 86_400) / 120))
  })

  it('não faz chamadas quando desabilitado ou com menos de 2 serviços', () => {
    const spy = vi.spyOn(backendServices, 'fetchServiceComparison').mockResolvedValue(sampleResult)

    const { rerender } = render(<Harness list={[services[0]]} enabled />)
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(spy).not.toHaveBeenCalled()

    rerender(<Harness list={services} enabled={false} />)
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(spy).not.toHaveBeenCalled()
  })

  it('carrega comparação do backend e expõe o resumo estatístico', async () => {
    const spy = vi.spyOn(backendServices, 'fetchServiceComparison').mockResolvedValue(sampleResult)

    render(
      <Harness
        list={services}
        enabled
        filters={{ preset: '24h', from: null, to: null, search: '' }}
      />,
    )

    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('efficiency').textContent).toBe('60')
    })

    expect(spy).toHaveBeenCalledWith(
      ['uuid-billing', 'uuid-auth'],
      expect.objectContaining({ bucketSeconds: expect.any(Number) }),
      expect.any(AbortSignal),
    )
  })

  it('expõe mensagem de erro quando a requisição falha e aborta ao desmontar', async () => {
    let capturedSignal: AbortSignal | undefined
    vi.spyOn(backendServices, 'fetchServiceComparison').mockImplementation(async (_ids, _range, signal) => {
      capturedSignal = signal
      throw new Error('Falha de rede')
    })

    const { unmount } = render(<Harness list={services} enabled />)

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Falha de rede')
    })

    unmount()
    expect(capturedSignal?.aborted).toBe(true)
  })
})
