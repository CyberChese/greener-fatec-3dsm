import { formatKg } from '@/lib/format'
import { CLOUD_PROVIDER_UNKNOWN, type LocationGroup } from '@/lib/map-groups'
import { StatusBadge } from '../dashboard/status-badge'

/** Conteúdo do popup de um marcador (TASK-026): nome, provedor, cidade/país e pegada de carbono atual. */
export function ServicePopupContent({ group }: { group: LocationGroup }) {
  return (
    <div className="geo-popup">
      {group.services.map((s) => (
        <article key={s.id} className="geo-popup__item">
          <h3 className="geo-popup__title">{s.name}</h3>
          <StatusBadge status={s.status} />
          <dl className="geo-popup__list">
            <div>
              <dt>Provedor de nuvem</dt>
              <dd>
                {CLOUD_PROVIDER_UNKNOWN}
                {s.location.region_code ? ` · região ${s.location.region_code}` : ''}
              </dd>
            </div>
            <div>
              <dt>Cidade/País</dt>
              <dd>{[s.location.city ?? 'cidade não informada', s.location.country].filter(Boolean).join(' / ')}</dd>
            </div>
            <div>
              <dt>Pegada de carbono atual</dt>
              <dd>
                {formatKg(s.co2eKg)} kgCO₂e
                {s.co2eKg == null ? ' (ainda não calculada pelo backend)' : ''}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
