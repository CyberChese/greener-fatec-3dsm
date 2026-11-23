// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePeriodTotals } from '@/hooks/use-period-totals'
import type { PeriodTotals } from '@/lib/calculations'
import { DEFAULT_FILTERS, type TimeFilters } from '@/lib/dashboard-filters'

afterEach(cleanup)

function Harness({
  filters = DEFAULT_FILTERS,
  enabled = true,
  load,
}: {
  filters?: TimeFilters
  enabled?: boolean
  load: Parameters<typeof usePeriodTotals>[3]
}) {
  const { totals, range, error, loading } = usePeriodTotals(filters, 'tick-1', enabled, load)
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{totals?.size ?? -1}</span>
      <span data-testid="has-range">{String(Boolean(range?.from && range?.to))}</span>
      <span data-testid="error">{error ?? ''}</span>
    </div>
  )
}

describe('usePeriodTotals (TASK-045 / TASK-050)', () => {
  it('carrega totais do período e preenche o intervalo resolvido', async () => {
    const load = vi.fn().mockResolvedValue(
      new Map<string, PeriodTotals>([['billing', { energyKwh: 0.002, co2eKg: 0.0009, samples: 0 }]]),
    )

    render(<Harness load={load} />)

    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('count').textContent).toBe('1')
      expect(screen.getByTestId('has-range').textContent).toBe('true')
    })
  })

  it('não dispara consulta quando desabilitado (modo simulado)', () => {
    const load = vi.fn()
    render(<Harness enabled={false} load={load} />)

    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(load).not.toHaveBeenCalled()
  })

  it('captura erro de rede e cancela requisição pendente ao desmontar', async () => {
    let signalRef: AbortSignal | undefined
    const load = vi.fn().mockImplementation(async (_range, signal?: AbortSignal) => {
      signalRef = signal
      throw new Error('Serviço indisponível')
    })

    const { unmount } = render(<Harness load={load} />)

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Serviço indisponível')
    })

    unmount()
    expect(signalRef?.aborted).toBe(true)
  })
})
