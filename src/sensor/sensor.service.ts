import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
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

  async create(sensor: Sensors): Promise<Sensors> {
    try {
      return await this.sensorRepository.save(sensor);
    } catch (error) {
      rethrowDbError(error, 'el sensor');
    }
  }

  async findOne(id: number): Promise<Sensors> {
    const item = await this.sensorRepository.findOneBy({ sensor_id: id });
    if (!item) throw new NotFoundException(`No existe el sensor con ID ${id}`);
    return item;
  }

  async update(id: number, data: Partial<Sensors>): Promise<Sensors> {
    await this.findOne(id);
    const { sensor_id: _ignored, ...changes } = data;
    try {
      await this.sensorRepository.update(id, changes);
    } catch (error) {
      rethrowDbError(error, 'el sensor');
    }
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.sensorRepository.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el sensor');
    }
  }
}
