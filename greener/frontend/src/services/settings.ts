import { DEFAULT_SETTINGS, validateSettings, type MonitoringSettings } from '@/lib/settings'
import { SimulatedApiError } from '@/lib/types'

/**
 * Simulação da persistência das configurações (RF16) no localStorage do navegador.
 * No sistema final estas funções viram GET/PUT em uma rota protegida por JWT no backend (RP07).
 */
const STORAGE_KEY = 'greener.settings.v1'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function loadSettings(): Promise<MonitoringSettings> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<MonitoringSettings>
    const checked = validateSettings({
      intervalSeconds: String(parsed.intervalSeconds ?? ''),
      defaultPeriod: String(parsed.defaultPeriod ?? ''),
    })
    return checked.value ?? DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: MonitoringSettings): Promise<void> {
  await wait(400)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    throw new SimulatedApiError(500, 'storage_unavailable', 'Não foi possível salvar as configurações neste navegador.')
  }
}
