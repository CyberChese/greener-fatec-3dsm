import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GeographicMapComponent } from '@/components/map/geographic-map-component'
import { snapshot } from './fixtures'

// Leaflet e react-leaflet isolados por mocks: nada de DOM real do mapa nem requisições ao tile server.
const tileLayer = vi.hoisted(() => vi.fn<(props: { url: string }) => null>(() => null))

vi.mock('leaflet', () => ({
  divIcon: (options: unknown) => options,
  latLngBounds: (points: unknown) => points,
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: tileLayer,
  Marker: ({ children, title, position }: { children: ReactNode; title: string; position: [number, number] }) => (
    <div data-testid="marker" data-title={title} data-position={position.join(',')}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const at = (latitude: number | null, longitude: number | null, city: string | null = null) => ({
  region_code: 'br-sudeste',
  country: 'Brazil',
  region: 'Sudeste',
  city,
  latitude,
  longitude,
})

const count = (html: string, needle: string) => html.split(needle).length - 1

describe('GeographicMapComponent com mapa mockado (TASK-026)', () => {
  it('cria um marcador por coordenada com o popup do grupo', () => {
    const html = renderToStaticMarkup(
      <GeographicMapComponent
        services={[
          snapshot({ id: 'a', name: 'Billing API', co2eKg: 1.234, location: at(-23.55, -46.63, 'Sao Paulo') }),
          snapshot({ id: 'b', name: 'Auth API', status: 'unavailable', location: at(35.67, 139.65, 'Tokyo') }),
        ]}
      />,
    )
    expect(count(html, 'data-testid="marker"')).toBe(2)
    expect(count(html, 'data-testid="popup"')).toBe(2)
    expect(html).toContain('data-position="-23.55,-46.63"')
    expect(html).toContain('data-title="Auth API: Serviço Indisponível"')
    expect(html).toContain('Sao Paulo / Brazil')
    expect(html).toContain('1,234 kgCO₂e')
  })

  it('não gera marcador para serviço sem coordenadas', () => {
    const html = renderToStaticMarkup(
      <GeographicMapComponent services={[snapshot({ name: 'Sem Local', location: at(null, null) })]} />,
    )
    expect(html).not.toContain('data-testid="marker"')
    expect(html).toContain('sem coordenadas não aparecem no mapa: Sem Local')
  })

  it('a camada de tiles é mockada e não faz chamada real ao tile server', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rede bloqueada no teste'))
    renderToStaticMarkup(<GeographicMapComponent services={[snapshot({ location: at(1, 2) })]} />)
    expect(tileLayer).toHaveBeenCalled()
    expect(tileLayer.mock.calls[0][0].url).toContain('tile.openstreetmap.org')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
