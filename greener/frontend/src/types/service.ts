/**
 * Estado de um serviço monitorado.
 *
 * Os três primeiros valores seguem o vocabulário do Agregador de Métricas
 * (available, unavailable, metrics_missing). "removed" é derivado pelo GreenER:
 * o serviço deixou de aparecer em /services e foi marcado como removido.
 *
 * TODO: alinhar estes nomes com o DTO do backend quando ele existir.
 */
export type ServiceState =
  | 'available'
  | 'unavailable'
  | 'metrics_missing'
  | 'removed'
