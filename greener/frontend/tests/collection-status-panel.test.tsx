import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CollectionStatusView } from '@/components/dashboard/collection-status-panel'

const render = (props: Parameters<typeof CollectionStatusView>[0]) => renderToStaticMarkup(<CollectionStatusView {...props} />)

describe('CollectionStatusView (task 015)', () => {
  it('mostra o carregamento', () => {
    expect(render({ status: null, error: null, loading: true })).toContain('Carregando informações da coleta')
  })

  it('mostra intervalo e última coleta', () => {
    const html = render({
      status: { interval_seconds: 60, last_collection_at: '2026-10-26T12:00:00.000Z' },
      error: null,
      loading: false,
    })
    expect(html).toContain('60 segundos após o término do ciclo anterior')
    expect(html).not.toContain('Nenhuma coleta registrada ainda')
  })

  it('avisa quando ainda não houve coleta', () => {
    const html = render({ status: { interval_seconds: 30, last_collection_at: null }, error: null, loading: false })
    expect(html).toContain('Nenhuma coleta registrada ainda')
  })

  it('mostra o erro sem esconder o último estado conhecido', () => {
    const html = render({
      status: { interval_seconds: 30, last_collection_at: null },
      error: 'timeout',
      loading: false,
    })
    expect(html).toContain('Não foi possível consultar a atualização: timeout')
    expect(html).toContain('30 segundos')
  })
})
