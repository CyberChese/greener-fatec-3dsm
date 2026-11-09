import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ServicePopupContent } from '@/components/map/service-popup-content'
import { groupByLocation, servicesWithoutCoordinates, worstStatus } from '@/lib/map-groups'
import { snapshot } from './fixtures'

const at = (latitude: number | null, longitude: number | null, city: string | null = null) => ({
  region_code: 'br-sudeste',
  country: 'Brazil',
  region: 'Sudeste',
  city,
  latitude,
  longitude,
})

describe('agrupamento do mapa (TASK-026)', () => {
  it('cria um marcador por coordenada e junta serviços no mesmo ponto', () => {
    const groups = groupByLocation([
      snapshot({ id: 'a', location: at(-23.55, -46.63) }),
      snapshot({ id: 'b', location: at(-23.55, -46.63) }),
      snapshot({ id: 'c', location: at(35.67, 139.65) }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((g) => g.services.length === 2)?.services.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('separa os serviços sem coordenadas, que não ganham marcador', () => {
    const list = [snapshot({ id: 'a', location: at(1, 2) }), snapshot({ id: 'b', location: at(null, null) })]
    expect(groupByLocation(list)).toHaveLength(1)
    expect(servicesWithoutCoordinates(list).map((s) => s.id)).toEqual(['b'])
  })

  it('mostra no marcador o pior estado do grupo', () => {
    expect(worstStatus([snapshot({ status: 'active' }), snapshot({ status: 'no_metrics' })])).toBe('no_metrics')
    expect(worstStatus([snapshot({ status: 'no_metrics' }), snapshot({ status: 'unavailable' })])).toBe('unavailable')
    expect(worstStatus([snapshot({ status: 'active' })])).toBe('active')
  })
})

describe('ServicePopupContent (TASK-026)', () => {
  const render = (services: ReturnType<typeof snapshot>[]) => {
    const [group] = groupByLocation(services)
    return renderToStaticMarkup(<ServicePopupContent group={group} />)
  }

  it('exibe nome, provedor, cidade/país e pegada de carbono', () => {
    const html = render([snapshot({ name: 'Billing API', co2eKg: 1.234, location: at(-23.55, -46.63, 'Sao Paulo') })])
    expect(html).toContain('Billing API')
    expect(html).toContain('Provedor de nuvem')
    expect(html).toContain('região br-sudeste')
    expect(html).toContain('Sao Paulo / Brazil')
    expect(html).toContain('Pegada de carbono atual')
    expect(html).toContain('1,234 kgCO₂e')
  })

  it('não inventa a pegada quando o backend ainda não calculou', () => {
    const html = render([snapshot({ co2eKg: null, location: at(1, 2) })])
    expect(html).toContain('—')
    expect(html).toContain('ainda não calculada pelo backend')
  })

  it('lista todos os serviços do mesmo ponto', () => {
    const html = render([
      snapshot({ id: 'a', name: 'A', location: at(1, 2) }),
      snapshot({ id: 'b', name: 'B', location: at(1, 2) }),
    ])
    expect(html).toContain('>A<')
    expect(html).toContain('>B<')
  })
})
