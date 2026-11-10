/**
 * Origem dos dados do painel:
 * - 'api' (padrão): serviços reais do backend (GET /api/services). Energia e CO2e de cada serviço somam as coletas dos
 *   últimos 15 minutos do histórico; sem medição, aparece "—".
 * - 'simulated': simulação no navegador (demonstração), ligada com VITE_DATA_SOURCE=simulated.
 */
export type DataSource = 'api' | 'simulated'

export const DATA_SOURCE: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'simulated' ? 'simulated' : 'api'

export const IS_SIMULATED = DATA_SOURCE === 'simulated'
