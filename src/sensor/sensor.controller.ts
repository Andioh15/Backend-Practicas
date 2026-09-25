import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
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

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Sensors>): Promise<Sensors> {
    return this.sensorService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.sensorService.delete(id);
  }
}
