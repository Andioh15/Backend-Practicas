import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reading } from '../entities/reading.entity';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(Reading)
    private readingRepository: Repository<Reading>,
  ) {}

  findAll(): Promise<Reading[]> {
    return this.readingRepository.find();
  }

  create(reading: Reading): Promise<Reading> {
    return this.readingRepository.save(reading);
  }
}
