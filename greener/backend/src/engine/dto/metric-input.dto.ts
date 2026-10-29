export class MetricInputDto{

/** Porcentagem de uso de CPU (0-100) */
cpuUsagePercent: number;

/** Quantidade de memória utilizada em MB   */
memoryUsedMb: number;

/** Taxa de leitura e escrita em disco em MB/s (opcional)  */
diskIoMBps?: number;

/** Taxa de trafego de rede em MB/s (opcional)  */
networkIoMBps?: number;

///** Duração da métrica em segundos (opcional) (padrao: 60s) */
durationSeconds?: number;

}