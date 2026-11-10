import { IS_SIMULATED } from '@/lib/dataSource'
import { formatKg } from '@/lib/format'
import { CLOUD_PROVIDER_UNKNOWN, type LocationGroup } from '@/lib/map-groups'
import { IMPACT_WINDOW_LABEL } from '@/services/backend-services'
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
              <dt>{IS_SIMULATED ? 'Pegada de carbono atual' : `Emissão de CO₂e (${IMPACT_WINDOW_LABEL})`}</dt>
              <dd>
                {formatKg(s.co2eKg)} kgCO₂e
                {s.co2eKg == null ? ' (sem medição no período)' : ''}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
