import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensors } from '../entities/sensors.entity';

@Injectable()
export class SensorService {
  constructor(
    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,
  ) {}

  findAll(): Promise<Sensors[]> {
    return this.sensorRepository.find();
  }

  create(sensor: Sensors): Promise<Sensors> {
    return this.sensorRepository.save(sensor);
  }
}
