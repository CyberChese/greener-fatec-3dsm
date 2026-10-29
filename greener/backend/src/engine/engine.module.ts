import {Module} from '@nestjs/common';
import {EnergyEngineService} from './energy-engine.service';

@Module({
    providers: [EnergyEngineService],
    exports: [EnergyEngineService],
})
export class EngineModule {}
