import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readings } from '../entities/readings.entity';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,
  ) {}

  findAll(): Promise<Readings[]> {
    return this.readingRepository.find();
  }

  create(reading: Readings): Promise<Readings> {
    return this.readingRepository.save(reading);
  }
}
