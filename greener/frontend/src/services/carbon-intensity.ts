import { SimulatedApiError, type CarbonIntensity } from '@/lib/types'

/**
 * Simulação client-side da Greener Carbon Intensity API (https://carbon.unilaunch.org).
 * Apenas br-sudeste (85 gCO₂e/kWh) reflete o valor publicado; as demais regiões são exemplos.
 */

const REGIONS: Record<string, CarbonIntensity> = {
  'br-sudeste': region('br-sudeste', 'Brazil', 'Sudeste', 'São Paulo', 85, 83),
  'us-east': region('us-east', 'United States of America', 'Virginia', 'Ashburn', 380, 22),
  'eu-west': region('eu-west', 'Ireland', 'Leinster', 'Dublin', 290, 41),
  'eu-central': region('eu-central', 'Germany', 'Hesse', 'Frankfurt', 350, 52),
  'ca-central': region('ca-central', 'Canada', 'Quebec', 'Montreal', 30, 94),
  'jp-east': region('jp-east', 'Japan', 'Kanto', 'Tokyo', 470, 23),
  'ap-south': region('ap-south', 'India', 'Maharashtra', 'Mumbai', 690, 19),
  'au-east': region('au-east', 'Australia', 'New South Wales', 'Sydney', 560, 32),
}

function region(
  region_code: string,
  country: string,
  regionName: string,
  city: string,
  intensity: number,
  renewable: number,
): CarbonIntensity {
  return {
    region_code,
    country,
    region: regionName,
    city,
    carbon_intensity_gco2e_per_kwh: intensity,
    renewable_share_percent: renewable,
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** GET /regions/{code}/carbon-intensity */
export async function getCarbonIntensity(code: string): Promise<CarbonIntensity> {
  await wait(30 + Math.random() * 90)
  if (Math.random() < 0.02) {
    throw new SimulatedApiError(503, 'carbon_api_unavailable', 'Serviço de Intensidade de Carbono indisponível')
  }
  const entry = REGIONS[code]
  if (!entry) throw new SimulatedApiError(404, 'region_not_found', `region '${code}' not found`)
  return { ...entry }
}
