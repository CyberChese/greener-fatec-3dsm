import 'leaflet/dist/leaflet.css'
import '@/styles/map.css'
import { divIcon, latLngBounds } from 'leaflet'
import type { DivIcon } from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { groupByLocation, servicesWithoutCoordinates, type LocationGroup } from '@/lib/map-groups'
import type { ServiceSnapshot, ServiceStatus } from '@/lib/types'
import { STATUS_META } from '../dashboard/status-meta'
import { ServicePopupContent } from './service-popup-content'

// Tiles do OpenStreetMap (sem chave de API). O tema escuro vem de um filtro CSS em map.css.
const TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILES_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function markerIcon(group: LocationGroup): DivIcon {
  const count = group.services.length
  return divIcon({
    className: 'geo-marker',
    html: `<span class="geo-marker__dot" style="--c:${STATUS_META[group.status].hex}">${count > 1 ? count : ''}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

/** Enquadra o mapa nos marcadores sempre que o conjunto de localizações muda (não a cada coleta). */
function FitBounds({ locations }: { locations: string }) {
  const map = useMap()
  useEffect(() => {
    if (!locations) return
    const points = locations.split(';').map((p) => p.split(',').map(Number) as [number, number])
    map.fitBounds(latLngBounds(points), { padding: [48, 48], maxZoom: 5 })
  }, [map, locations])
  return null
}

const markerTitle = (group: LocationGroup) =>
  `${group.services.map((s) => s.name).join(', ')}: ${STATUS_META[group.status].badgeLabel}`

/**
 * Mapa geográfico interativo (Leaflet). Cada localização com coordenadas vira um marcador colorido pelo estado
 * (com contador quando há mais de um serviço no mesmo ponto); o clique abre o popup com os detalhes.
 */
export function GeographicMapComponent({ services }: { services: ServiceSnapshot[] }) {
  const groups = useMemo(() => groupByLocation(services), [services])
  const missing = useMemo(() => servicesWithoutCoordinates(services), [services])
  const locations = useMemo(
    () =>
      groups
        .map((g) => g.key)
        .sort()
        .join(';'),
    [groups],
  )
  const statuses = Object.keys(STATUS_META) as ServiceStatus[]

  return (
    <div className="flex flex-col gap-3">
      <div
        role="region"
        aria-label="Mapa geográfico dos serviços monitorados"
        className="overflow-hidden rounded-2xl border border-white/[0.08]"
      >
        <MapContainer center={[20, 0]} zoom={2} minZoom={2} worldCopyJump className="geo-map h-[62vh] min-h-[360px] w-full">
          <TileLayer url={TILES_URL} attribution={TILES_ATTRIBUTION} maxZoom={19} />
          <FitBounds locations={locations} />
          {groups.map((group) => (
            <Marker
              key={group.key}
              position={[group.latitude, group.longitude]}
              icon={markerIcon(group)}
              title={markerTitle(group)}
            >
              <Popup maxWidth={320} minWidth={240}>
                <ServicePopupContent group={group} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <ul aria-label="Legenda dos marcadores" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-zinc-400">
        {statuses.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-full" style={{ background: STATUS_META[status].hex }} />
            {STATUS_META[status].badgeLabel}
          </li>
        ))}
        <li className="text-ink-subtle">O número no marcador indica quantos serviços estão no mesmo ponto.</li>
      </ul>

      {missing.length > 0 ? (
        <p className="text-xs text-ink-subtle">
          {missing.length} serviço(s) sem coordenadas não aparecem no mapa: {missing.map((s) => s.name).join(', ')}.
        </p>
      ) : null}
    </div>
  )
}
