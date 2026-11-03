import { Injectable, Logger } from '@nestjs/common';
import { MetricInputDto } from './dto/metric-input.dto';

@Injectable()
export class EnergyEngineService {
  private readonly logger = new Logger(EnergyEngineService.name);

  private readonly CPU_IDLE_WATTS = 20;
  private readonly CPU_MAX_WATTS = 100;
  private readonly MEMORY_WATTS_PER_GB = 0.375;
  private readonly DISK_WATTS_PER_MBPS = 0.001;
  private readonly NETWORK_WATTS_PER_MBPS = 0.005;
  // metric_collections.energy_kwh is numeric(12,8): four integer digits.
  private readonly MAX_PERSISTED_ENERGY_KWH = 9_999.99999999;

  calculatekWh(input: MetricInputDto): number {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new TypeError('Metric input must be an object.');
    }

    const cpuPercent = this.requireFiniteNumber(
      input.cpuUsagePercent,
      'cpuUsagePercent',
    );
    if (cpuPercent < 0 || cpuPercent > 100) {
      throw new RangeError('cpuUsagePercent must be between 0 and 100.');
    }

    const memoryUsedMb = this.requireNonNegativeNumber(
      input.memoryUsedMb,
      'memoryUsedMb',
    );
    const diskMBps = this.optionalNonNegativeNumber(
      input.diskIoMBps,
      'diskIoMBps',
    );
    const networkMBps = this.optionalNonNegativeNumber(
      input.networkIoMBps,
      'networkIoMBps',
    );
    const durationSeconds = this.requirePositiveNumber(
      input.durationSeconds,
      'durationSeconds',
    );

    const cpuWatts =
      this.CPU_IDLE_WATTS +
      (this.CPU_MAX_WATTS - this.CPU_IDLE_WATTS) * (cpuPercent / 100);
    const memoryGb = memoryUsedMb / 1024;
    const memoryWatts = memoryGb * this.MEMORY_WATTS_PER_GB;
    const diskWatts = diskMBps * this.DISK_WATTS_PER_MBPS;
    const networkWatts = networkMBps * this.NETWORK_WATTS_PER_MBPS;
    const totalWatts = cpuWatts + memoryWatts + diskWatts + networkWatts;
    const energyKwh = (totalWatts * durationSeconds) / 3_600_000;

    if (!Number.isFinite(energyKwh)) {
      throw new RangeError('Calculated energy is outside the supported range.');
    }

    const roundedKwh = Number(energyKwh.toFixed(8));
    if (roundedKwh > this.MAX_PERSISTED_ENERGY_KWH) {
      throw new RangeError(
        `Calculated energy exceeds the metric_collections.energy_kwh limit of ${this.MAX_PERSISTED_ENERGY_KWH} kWh.`,
      );
    }

    this.logger.debug(
      `Metrics processed: CPU=${cpuPercent}% (${cpuWatts.toFixed(2)}W), ` +
        `RAM=${memoryGb.toFixed(2)}GB (${memoryWatts.toFixed(2)}W), ` +
        `disk=${diskMBps}MB/s (${diskWatts.toFixed(4)}W), ` +
        `network=${networkMBps}MB/s (${networkWatts.toFixed(4)}W), ` +
        `interval=${durationSeconds}s => energy=${roundedKwh} kWh`,
    );

    return roundedKwh;
  }

  private requireFiniteNumber(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number.`);
    }
    return value;
  }

  private requireNonNegativeNumber(value: unknown, name: string): number {
    const number = this.requireFiniteNumber(value, name);
    if (number < 0) {
      throw new RangeError(`${name} must be non-negative.`);
    }
    return number;
  }

  private requirePositiveNumber(value: unknown, name: string): number {
    const number = this.requireFiniteNumber(value, name);
    if (number <= 0) {
      throw new RangeError(`${name} must be greater than zero.`);
    }
    return number;
  }

  private optionalNonNegativeNumber(
    value: number | undefined,
    name: string,
  ): number {
    return value === undefined ? 0 : this.requireNonNegativeNumber(value, name);
  }
}
