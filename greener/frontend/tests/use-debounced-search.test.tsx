// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedSearch } from '@/hooks/use-debounced-search'

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useDebouncedSearch: debounce de 300 ms (TASK-045)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('várias teclas em sequência geram uma única confirmação com o texto final', async () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useDebouncedSearch('', onCommit))

    act(() => result.current[1]('b'))
    await advance(100)
    act(() => result.current[1]('bi'))
    await advance(100)
    act(() => result.current[1]('bil'))
    await advance(299)
    expect(onCommit).not.toHaveBeenCalled()

    await advance(1)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('bil')
  })

  it('o campo mostra o texto na hora, antes da confirmação', () => {
    const { result } = renderHook(() => useDebouncedSearch('', vi.fn()))
    act(() => result.current[1]('auth'))
    expect(result.current[0]).toBe('auth')
  })

  it('não confirma quando o texto volta ao valor já aplicado', async () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useDebouncedSearch('api', onCommit))

    act(() => result.current[1]('apix'))
    await advance(100)
    act(() => result.current[1]('api '))
    await advance(500)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('acompanha mudanças externas, como limpar os filtros ou voltar no navegador', async () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedSearch(value, onCommit), {
      initialProps: { value: 'billing' },
    })

    rerender({ value: '' })
    expect(result.current[0]).toBe('')

    await advance(500)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('mantém o texto digitado quando a URL reflete a própria confirmação', async () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedSearch(value, onCommit), {
      initialProps: { value: '' },
    })

    act(() => result.current[1]('sea'))
    await advance(300)
    act(() => result.current[1]('search'))
    rerender({ value: 'sea' })

    expect(result.current[0]).toBe('search')
  })
})
