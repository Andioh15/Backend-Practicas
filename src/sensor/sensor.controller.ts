import { Controller, Get, Post, Body } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { Sensors } from '../entities/sensors.entity';

@Controller('sensor')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Get()
  findAll(): Promise<Sensors[]> {
    return this.sensorService.findAll();
  }

  @Post()
  create(@Body() sensor: Sensors): Promise<Sensors> {
    return this.sensorService.create(sensor);
  }
}
