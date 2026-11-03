export class MetricInputDto {
  /** CPU usage percentage, from 0 through 100. */
  cpuUsagePercent: number;

  /** Memory usage in MB. */
  memoryUsedMb: number;

  /** Disk I/O rate in MB/s, when supplied by a source with that unit. */
  diskIoMBps?: number;

  /** Network I/O rate in MB/s, when supplied by a source with that unit. */
  networkIoMBps?: number;

  /** Duration represented by the metrics, in positive seconds. */
  durationSeconds: number;
}
