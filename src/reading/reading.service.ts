import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,

    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,

    private dataSource: DataSource,  // Para consultas nativas
  ) {}

  findAll(): Promise<Readings[]> {
    return this.readingRepository.find();
  }

  create(reading: Readings): Promise<Readings> {
    return this.readingRepository.save(reading);
  }

  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];  // El resultado es un array, extraemos el primer elemento (JSON)
  }
}

