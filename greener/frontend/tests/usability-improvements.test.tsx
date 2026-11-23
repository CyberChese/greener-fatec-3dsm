// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { FormField } from '@/components/FormField'
import { HistoryTable } from '@/components/admin/history-table'
import { AppHeader } from '@/components/dashboard/app-header'
import { formatCountryName } from '@/lib/format'
import { record } from './fixtures'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('melhorias de usabilidade (TASK-047)', () => {
  it('permite revelar e ocultar a senha com um botão acessível', () => {
    render(<FormField id="password" label="Senha" type="password" value="segredo" readOnly />)
    const input = screen.getByLabelText('Senha') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })

    expect(input.type).toBe('password')
    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(input.type).toBe('password')
  })

  it('localiza nomes de países comuns sem alterar valores desconhecidos', () => {
    expect(formatCountryName('Brazil')).toBe('Brasil')
    expect(formatCountryName('United States')).toBe('Estados Unidos')
    expect(formatCountryName('United States of America')).toBe('Estados Unidos')
    expect(formatCountryName('Japan')).toBe('Japão')
    expect(formatCountryName('País não catalogado')).toBe('País não catalogado')
    expect(formatCountryName(null)).toBe('País não informado')
  })

  it('pede confirmação antes de remover o histórico e permite cancelar', () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      }),
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      }),
    })
    const onClear = vi.fn()
    render(<HistoryTable history={[record()]} onClear={onClear} intervalSeconds={30} />)

    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }))
    expect(screen.getByRole('dialog', { name: 'Limpar histórico de coletas?' })).toBeTruthy()
    expect(onClear).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClear).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, limpar histórico' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('identifica os controles de pausar e retomar atualização por rótulos acessíveis', () => {
    const onTogglePause = vi.fn()
    const props = {
      lastUpdated: null,
      simulatedNow: null,
      intervalMs: 3000,
      tick: 0,
      onTogglePause,
    }
    const { rerender } = render(
      <MemoryRouter>
        <AppHeader {...props} paused={false} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Pausar atualização automática' })[0])
    expect(onTogglePause).toHaveBeenCalledOnce()

    rerender(
      <MemoryRouter>
        <AppHeader {...props} paused />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('button', { name: 'Retomar atualização automática' })).toHaveLength(2)
  })
})
