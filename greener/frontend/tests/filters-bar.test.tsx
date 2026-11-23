// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FiltersBar } from '@/components/dashboard/filters-bar'
import { DEFAULT_FILTERS, type TimeFilters } from '@/lib/dashboard-filters'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const renderHtml = (filters: TimeFilters, extra: { loading?: boolean; error?: string | null } = {}) =>
  renderToStaticMarkup(
    <FiltersBar
      filters={filters}
      setPreset={() => {}}
      applyCustomRange={() => {}}
      setSearch={() => {}}
      clear={() => {}}
      periodLabel="últimos 7 dias"
      resultCount={3}
      totalCount={8}
      today="2026-11-16"
      {...extra}
    />,
  )

describe('FiltersBar (TASK-045 / TASK-050)', () => {
  it('oferece os atalhos de período e marca o que está aplicado', () => {
    const html = renderHtml(DEFAULT_FILTERS)
    for (const label of ['Últimas 24h', 'Últimos 7 dias', '30 dias', 'Personalizado']) expect(html).toContain(label)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Últimos 7 dias/)
    expect(html).toMatch(/aria-pressed="false"[^>]*>Últimas 24h/)
    expect(html).not.toContain('type="date"')
  })

  it('tem campo de busca por nome com rótulo', () => {
    const html = renderHtml({ ...DEFAULT_FILTERS, search: 'billing' })
    expect(html).toContain('Buscar serviço por nome')
    expect(html).toContain('value="billing"')
    expect(html).toContain('3 de 8 serviços exibidos.')
  })

  it('o período personalizado abre as datas preenchidas com o intervalo aplicado', () => {
    const html = renderHtml({ preset: 'custom', from: '2026-11-01', to: '2026-11-10', search: '' })
    expect(html).toContain('value="2026-11-01"')
    expect(html).toContain('value="2026-11-10"')
    expect(html).toContain('max="2026-11-16"')
    expect(html).toContain('Período aplicado')
  })

  it('só mostra o botão de limpar quando há filtro diferente do padrão', () => {
    expect(renderHtml(DEFAULT_FILTERS)).not.toContain('Limpar período e busca')
    expect(renderHtml({ ...DEFAULT_FILTERS, preset: '24h' })).toContain('Limpar período e busca')
  })

  it('informa carregamento e falha sem esconder os controles', () => {
    expect(renderHtml(DEFAULT_FILTERS, { loading: true })).toContain('Atualizando para')
    const failed = renderHtml(DEFAULT_FILTERS, { error: 'offline' })
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('offline')
    expect(failed).toContain('Últimas 24h')
  })

  it('permite trocar atalho de período, validar intervalo personalizado e limpar filtros via interação', () => {
    const setPreset = vi.fn()
    const applyCustomRange = vi.fn()
    const setSearch = vi.fn()
    const clear = vi.fn()

    render(
      <FiltersBar
        filters={{ ...DEFAULT_FILTERS, preset: '24h' }}
        setPreset={setPreset}
        applyCustomRange={applyCustomRange}
        setSearch={setSearch}
        clear={clear}
        periodLabel="últimas 24h"
        resultCount={2}
        totalCount={5}
        today="2026-11-16"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '30 dias' }))
    expect(setPreset).toHaveBeenCalledWith('30d')

    fireEvent.click(screen.getByRole('button', { name: /Personalizado/ }))
    const fromInput = screen.getByLabelText('Data inicial')
    const toInput = screen.getByLabelText('Data final')

    // Intervalo invertido deve bloquear o envio e exibir alerta acessível
    fireEvent.change(fromInput, { target: { value: '2026-11-12' } })
    fireEvent.change(toInput, { target: { value: '2026-11-05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }))
    expect(applyCustomRange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/anterior|inicial/i)

    // Intervalo válido aplica o período
    fireEvent.change(fromInput, { target: { value: '2026-11-01' } })
    fireEvent.change(toInput, { target: { value: '2026-11-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }))
    expect(applyCustomRange).toHaveBeenCalledWith('2026-11-01', '2026-11-10')

    fireEvent.click(screen.getByRole('button', { name: /Limpar período e busca/ }))
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('dispara setSearch com debounce ao digitar no campo de busca', () => {
    vi.useFakeTimers()
    const setSearch = vi.fn()

    render(
      <FiltersBar
        filters={DEFAULT_FILTERS}
        setPreset={() => {}}
        applyCustomRange={() => {}}
        setSearch={setSearch}
        clear={() => {}}
        periodLabel="últimos 7 dias"
        today="2026-11-16"
      />,
    )

    fireEvent.change(screen.getByLabelText('Buscar serviço por nome'), {
      target: { value: 'billing' },
    })

    expect(setSearch).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(350)
    })
    expect(setSearch).toHaveBeenCalledWith('billing')
  })
})
