import { Controller, Get, Post, Body } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { Sensor } from '../entities/sensor.entity';

@Controller('sensor')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Get()
  findAll(): Promise<Sensor[]> {
    return this.sensorService.findAll();
  }

  @Post()
  create(@Body() sensor: Sensor): Promise<Sensor> {
    return this.sensorService.create(sensor);
  }
}
