export interface ExternalLocationDto {
    region_code?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface ExternalServiceDto {
    id: string;
    name: string;
    location?: ExternalLocationDto;
    metrics_path?: string;
}

export interface InternalDiscoveredService {
    externalId: string;
    name: string;
    metricsPath?: string;
    location: {
        regionCode?: string;
        country?: string;
        region?: string;
        city?: string;
        lat?: number;
        lng?: number;
    };
}

export interface DiscoveryResult {
  services: InternalDiscoveredService[];
  isComplete: boolean;
}