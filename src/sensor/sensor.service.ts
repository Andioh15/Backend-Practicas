import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from '../entities/sensor.entity';

@Injectable()
export class SensorService {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
  ) {}

  findAll(): Promise<Sensor[]> {
    return this.sensorRepository.find();
  }

  create(sensor: Sensor): Promise<Sensor> {
    return this.sensorRepository.save(sensor);
  }
}
