import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sensors } from '../entities/sensors.entity';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sensors])],
  controllers: [SensorController],
  providers: [SensorService],
})
export class SensorModule {}
