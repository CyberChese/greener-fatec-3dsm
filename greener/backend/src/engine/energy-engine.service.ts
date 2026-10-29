import {Injectable,Logger} from '@nestjs/common';
import {MetricInputDto} from './dto/metric-input.dto';

@Injectable()
export class EnergyEngineService {
  private readonly logger = new Logger(EnergyEngineService.name);

  private readonly CPU_IDLE_WATTS = 20.0;
  private readonly CPU_MAX_WATTS = 100.0;
  private readonly MEMORY_WATTS_PER_GB = 0.375;
  private readonly DISK_WATTS_PER_MBPS = 0.001;
  private readonly NETWORK_WATTS_PER_MBPS = 0.005;
  private readonly DEFAULT_DURATION_SECONDS = 60;


  calculatekWh(input: MetricInputDto): number {
// 1. Sanitização e valores padrão para resiliência
    const cpuPercent = Math.min(Math.max(input.cpuUsagePercent || 0,0), 100);
    const memoryUsedMb = Math.max(input.memoryUsedMb || 0, 0);
    const diskMBps = Math.max(input.diskIoMBps || 0, 0);
    const networkMBps = Math.max(input.networkIoMBps || 0, 0);
    const durationSec = input.durationSeconds && input.durationSeconds > 0 ? input.durationSeconds : this.DEFAULT_DURATION_SECONDS;



// 2. Cálculo da Potência de CPU (Watts)
    const cpuWatts =this.CPU_IDLE_WATTS + (this.CPU_MAX_WATTS - this.CPU_IDLE_WATTS)*(cpuPercent / 100);
    
// 3. Cálculo da Potência de Memória RAM (Watts)
    const memoryGb = memoryUsedMb / 1024;
    const memoryWatts = memoryGb * this.MEMORY_WATTS_PER_GB;
    
// 4. Cálculo da Potência de I/O de Disco e Rede (Watts)
    const diskWatts = diskMBps * this.DISK_WATTS_PER_MBPS;
    const networkWatts = networkMBps * this.NETWORK_WATTS_PER_MBPS;

// 5. Potência Total Instantânea em Watts
    const totalWatts = cpuWatts + memoryWatts + diskWatts + networkWatts;

// 6. Conversão de Watts x Tempo para kWh
    const energyKwh = (totalWatts * durationSec) / 3600000;

// Arredonda para 8 casas decimais para manter precisão de micro-consumos    
    const roundedKwh = Number(energyKwh.toFixed(8));

    this.logger.debug(
        `Métricas processadas: CPU=${cpuPercent}% (${cpuWatts.toFixed(2)}W),`
        + `RAM=${memoryGb.toFixed(2)}GB (${memoryWatts.toFixed(2)}W)=>`
        + `Total=${totalWatts.toFixed(2)}W, Intervalo=${durationSec}s => Energia=${roundedKwh} kWh`
    );  
    return roundedKwh;
}
}