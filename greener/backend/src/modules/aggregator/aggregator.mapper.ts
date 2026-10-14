import { AggregatorContractError } from './aggregator.errors';
import { InternalDiscoveredService } from './types/aggregator.types';

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const obj = (v: unknown): Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};

export function mapDiscoveryResponse(payload: unknown): {
    services: InternalDiscoveredService[];
    invalidCount: number;
} {
    if (!Array.isArray(payload)) {
        throw new AggregatorContractError(
            'Resposta de descoberta fora do contrato: esperado um array.',
        );
    }

    const services: InternalDiscoveredService[] = [];
    let invalidCount = 0;

    for (const item of payload) {
        const raw = obj(item);
        const id = str(raw.id);
        const name = str(raw.name);

        // id (identificador estável) e name são obrigatórios
        if (!id || !name) {
            invalidCount++;
            continue;
        }

        const loc = obj(raw.location);
        services.push({
            externalId: id,
            name,
            metricsPath: str(raw.metrics_path),
            location: {
                regionCode: str(loc.region_code),
                country: str(loc.country),
                region: str(loc.region),
                city: str(loc.city),
                lat: num(loc.latitude),
                lng: num(loc.longitude),
            },
        });
    }

    return { services, invalidCount };
}