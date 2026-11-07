// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePublicSummary } from '@/hooks/use-public-summary'
import { parsePublicSummary, type SummaryResult } from '@/services/summary'

const summary = (active: number): SummaryResult => ({
  summary: parsePublicSummary({
    total_energy_kwh: 1,
    total_co2e_kg: 0.5,
    services_count: { active, unavailable: 0, no_metrics: 0 },
  }),
  source: 'api',
})

const INTERVAL = 60_000
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('usePublicSummary: polling (TASK-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('consulta logo ao montar e repete a cada intervalo', async () => {
    const load = vi.fn().mockResolvedValueOnce(summary(1)).mockResolvedValueOnce(summary(2))
    const { result } = renderHook(() => usePublicSummary({ intervalMs: INTERVAL, load }))
    expect(result.current.initialLoading).toBe(true)

    await tick(0)
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.initialLoading).toBe(false)
    expect(result.current.data?.summary.services.active).toBe(1)

    await tick(INTERVAL - 1)
    expect(load).toHaveBeenCalledTimes(1)
    await tick(1)
    expect(load).toHaveBeenCalledTimes(2)
    expect(result.current.data?.summary.services.active).toBe(2)
  })

  it('em erro mantém os dados anteriores e tenta de novo em 15 s', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(summary(3))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(summary(4))
    const { result } = renderHook(() => usePublicSummary({ intervalMs: INTERVAL, load }))

    await tick(0)
    await tick(INTERVAL)
    expect(load).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe('offline')
    expect(result.current.data?.summary.services.active).toBe(3)

    await tick(15_000)
    expect(load).toHaveBeenCalledTimes(3)
    expect(result.current.error).toBeNull()
    expect(result.current.data?.summary.services.active).toBe(4)
  })

  it('para o polling e cancela a requisição ao desmontar', async () => {
    let signal: AbortSignal | undefined
    const load = vi.fn((s?: AbortSignal) => {
      signal = s
      return new Promise<SummaryResult>(() => {})
    })
    const { unmount } = renderHook(() => usePublicSummary({ intervalMs: INTERVAL, load }))

    await tick(0)
    expect(load).toHaveBeenCalledTimes(1)
    unmount()
    expect(signal?.aborted).toBe(true)

    await tick(INTERVAL * 3)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
