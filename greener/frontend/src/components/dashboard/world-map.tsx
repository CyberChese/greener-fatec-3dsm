import { geoCentroid, geoCircle, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import { Locate, MapPinOff, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { formatKg, formatKwh } from '@/lib/format'
import type { QueryPoint, ServiceSnapshot } from '@/lib/types'
import { CardHeading, GlassCard } from './glass-card'
import { STATUS_META } from './status-meta'

const GEO_URL = '/data/countries-110m.json'
const DEFAULT_CENTER: [number, number] = [10, 15]
const MAP_WIDTH = 800
const MAP_HEIGHT = 420
const MIN_ZOOM = 1
const MAX_ZOOM = 8

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name?: string }>

// Mesma projeção e escala usadas no desenho inicial do mapa.
const projection = geoEqualEarth()
  .scale(165)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
const pathOf = geoPath(projection)
const graticulePath = pathOf(geoGraticule10()) ?? undefined

/** Baixa o TopoJSON dos países (public/data) uma única vez e o converte para GeoJSON. */
function useCountries(): CountryFeature[] {
  const [countries, setCountries] = useState<CountryFeature[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch(GEO_URL, { signal: controller.signal })
      .then((response) => response.json() as Promise<Topology>)
      .then((topology) => {
        const collection = feature(topology, topology.objects.countries as GeometryCollection<{ name?: string }>)
        setCountries(collection.features as CountryFeature[])
      })
      .catch(() => {
        // Sem o arquivo do mapa, os marcadores continuam funcionando sobre o fundo.
      })
    return () => controller.abort()
  }, [])
  return countries
}

type Layer = 'energy' | 'co2e'

interface WorldMapProps {
  services: ServiceSnapshot[]
  periodTotals: Map<string, { energyKwh: number; co2eKg: number }>
  point: QueryPoint
  selectedId: string | null
  onPickPoint: (latitude: number, longitude: number) => void
  onSelectService: (service: ServiceSnapshot) => void
}

function intensityColor(intensity: number) {
  const t = Math.max(0, Math.min(1, intensity / 650))
  const stops = [
    [52, 211, 153],
    [229, 216, 75],
    [249, 115, 22],
  ]
  const segment = t < 0.5 ? 0 : 1
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const [a, b] = [stops[segment], stops[segment + 1]]
  const mix = a.map((value, i) => Math.round(value + (b[i] - value) * local))
  return `rgb(${mix.join(',')})`
}

function RadiusOverlay({ point }: { point: QueryPoint }) {
  if (point.latitude == null || point.longitude == null) return null
  const circle = geoCircle()
    .center([point.longitude, point.latitude])
    .radius(point.radiusKm / 111.32)()
  return (
    <g pointerEvents="none">
      <path d={pathOf(circle as GeoPermissibleObjects) ?? undefined} fill="rgba(244,114,182,0.08)" stroke="#f472b6" strokeWidth={1.2} strokeDasharray="4 3" />
    </g>
  )
}

export function WorldMap({ services, periodTotals, point, selectedId, onPickPoint, onSelectService }: WorldMapProps) {
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [layer, setLayer] = useState<Layer>('co2e')
  const [hovered, setHovered] = useState<ServiceSnapshot | null>(null)
  const countries = useCountries()
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  function clampZoom(value: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  }

  // Arrastar o mapa move o centro (em coordenadas geográficas) conforme o zoom atual.
  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    drag.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const state = drag.current
    const svg = svgRef.current
    if (!state || !svg) return
    const dx = event.clientX - state.x
    const dy = event.clientY - state.y
    if (!state.moved && Math.hypot(dx, dy) < 4) return
    state.moved = true
    state.x = event.clientX
    state.y = event.clientY
    const unit = MAP_WIDTH / svg.getBoundingClientRect().width
    const current = projection(center)
    if (!current) return
    const next = projection.invert?.([current[0] - (dx * unit) / zoom, current[1] - (dy * unit) / zoom])
    if (next) setCenter([next[0], next[1]])
  }

  function handlePointerUp() {
    // O "moved" é lido pelo clique que vem logo depois e só então descartado.
    window.setTimeout(() => {
      drag.current = null
    }, 0)
  }

  const centerPixel = projection(center) ?? [MAP_WIDTH / 2, MAP_HEIGHT / 2]
  const groupTransform = `translate(${MAP_WIDTH / 2 - centerPixel[0] * zoom}, ${MAP_HEIGHT / 2 - centerPixel[1] * zoom}) scale(${zoom})`

  const intensityByCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of services) {
      if (s.intensity != null) map.set(s.location.country, Math.max(map.get(s.location.country) ?? 0, s.intensity))
    }
    return map
  }, [services])

  const plotted = services.filter((s) => s.location.latitude != null && s.location.longitude != null)
  const withoutCoordinates = services.length - plotted.length

  const maxValue = Math.max(
    1e-6,
    ...plotted.map((s) => {
      const t = periodTotals.get(s.id)
      return layer === 'energy' ? (t?.energyKwh ?? 0) : (t?.co2eKg ?? 0)
    }),
  )

  const offsets = new Map<string, number>()
  const hasPoint = point.latitude != null && point.longitude != null

  return (
    <GlassCard aria-labelledby="map-title" className="flex flex-col">
      <CardHeading
        eyebrow="Visualização geográfica"
        title="Mapa de impacto ambiental"
        id="map-title"
        aside={
          <div className="flex rounded-lg border border-edge p-0.5 text-xs" role="group" aria-label="Camada do mapa">
            {(
              [
                ['energy', 'Energia (kWh)'],
                ['co2e', 'Emissão (CO₂e)'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={layer === id}
                onClick={() => setLayer(id)}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  layer === id ? 'bg-lime-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.9),rgba(9,9,11,1))]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-label="Mapa-múndi com a posição aproximada dos serviços monitorados"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <g transform={groupTransform}>
            <path d={graticulePath} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
            {countries.map((geo, index) => {
              const name = geo.properties?.name ?? ''
              const intensity = intensityByCountry.get(name)
              const fill = intensity != null ? intensityColor(intensity) : '#27272a'
              return (
                <path
                  key={`${name}-${index}`}
                  d={pathOf(geo) ?? undefined}
                  fill={fill}
                  fillOpacity={intensity != null ? 0.55 : 1}
                  stroke="#09090b"
                  strokeWidth={0.4}
                  className="cursor-crosshair hover:stroke-lime-400"
                  onClick={() => {
                    if (drag.current?.moved) return
                    const [lon, lat] = geoCentroid(geo)
                    onPickPoint(Number(lat.toFixed(2)), Number(lon.toFixed(2)))
                  }}
                >
                  <title>{`${name}${intensity != null ? ` · ${intensity} gCO₂e/kWh` : ''}`}</title>
                </path>
              )
            })}

            <RadiusOverlay point={point} />

            {hasPoint ? (
              <g
                transform={`translate(${(projection([point.longitude as number, point.latitude as number]) ?? [0, 0]).join(',')})`}
                pointerEvents="none"
              >
                <circle r={3.5 / zoom} fill="#f472b6" stroke="#09090b" strokeWidth={1 / zoom} />
              </g>
            ) : null}

            {plotted.map((s) => {
              const key = `${s.location.latitude},${s.location.longitude}`
              const index = offsets.get(key) ?? 0
              offsets.set(key, index + 1)
              const totals = periodTotals.get(s.id)
              const value = layer === 'energy' ? (totals?.energyKwh ?? 0) : (totals?.co2eKg ?? 0)
              const radius = (6 + 10 * Math.sqrt(value / maxValue)) / Math.sqrt(zoom)
              const meta = STATUS_META[s.status]
              const Icon = meta.icon
              const iconSize = 10 / Math.sqrt(zoom)
              const dx = index * 7
              const [px, py] = projection([s.location.longitude as number, s.location.latitude as number]) ?? [0, 0]

              return (
                <g
                  key={s.id}
                  transform={`translate(${px}, ${py})`}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.name}, ${meta.label}. Usar como ponto de consulta`}
                  onClick={() => {
                    if (drag.current?.moved) return
                    onSelectService(s)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectService(s)
                    }
                  }}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(s)}
                  onBlur={() => setHovered(null)}
                >
                  <g transform={`translate(${dx / Math.sqrt(zoom)}, 0)`}>
                    <circle
                      r={radius}
                      fill={layer === 'energy' ? 'rgba(251,191,36,0.28)' : 'rgba(167,139,250,0.3)'}
                      stroke={selectedId === s.id ? '#a3e635' : meta.hex}
                      strokeWidth={(selectedId === s.id ? 2.2 : 1.4) / Math.sqrt(zoom)}
                    />
                    <circle r={iconSize * 0.75} fill="#09090b" />
                    <Icon
                      x={-iconSize / 2}
                      y={-iconSize / 2}
                      width={iconSize}
                      height={iconSize}
                      color={meta.hex}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    <title>{`${s.name} — ${meta.label}`}</title>
                  </g>
                </g>
              )
            })}
          </g>
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute top-3 left-3 w-56 rounded-xl border border-white/10 bg-zinc-950/90 p-3 text-xs backdrop-blur-md">
            <p className="font-semibold text-zinc-100">{hovered.name}</p>
            <p className="text-ink-subtle">
              {[hovered.location.city, hovered.location.region, hovered.location.country].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1" style={{ color: STATUS_META[hovered.status].hex }}>
              {STATUS_META[hovered.status].label}
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-zinc-300">
              <dt className="text-ink-subtle">kWh</dt>
              <dd className="text-right">{formatKwh(periodTotals.get(hovered.id)?.energyKwh ?? null)}</dd>
              <dt className="text-ink-subtle">kgCO₂e</dt>
              <dd className="text-right">{formatKg(periodTotals.get(hovered.id)?.co2eKg ?? null)}</dd>
            </dl>
          </div>
        ) : null}

        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-edge bg-zinc-950/80 backdrop-blur">
          <button type="button" aria-label="Aproximar" onClick={() => setZoom((z) => clampZoom(z * 1.5))} className="grid size-9 place-items-center text-zinc-300 hover:bg-white/5 hover:text-lime-300">
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Afastar" onClick={() => setZoom((z) => clampZoom(z / 1.5))} className="grid size-9 place-items-center border-y border-edge text-zinc-300 hover:bg-white/5 hover:text-lime-300">
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Redefinir posição e zoom"
            onClick={() => {
              setZoom(1)
              setCenter(DEFAULT_CENTER)
            }}
            className="grid size-9 place-items-center text-zinc-300 hover:bg-white/5 hover:text-lime-300"
          >
            <Locate className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <span key={key} className="inline-flex items-center gap-1.5">
              <Icon className="size-3.5" style={{ color: meta.hex }} aria-hidden="true" />
              {meta.label}
            </span>
          )
        })}
        <span className="inline-flex items-center gap-2">
          Intensidade do país
          <span className="h-2 w-24 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-500" aria-hidden="true" />
          baixa → alta
        </span>
        {withoutCoordinates > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-ink-subtle">
            <MapPinOff className="size-3.5" aria-hidden="true" />
            {withoutCoordinates} serviço(s) sem coordenadas — visíveis apenas na tabela
          </span>
        ) : null}
      </div>
    </GlassCard>
  )
}
