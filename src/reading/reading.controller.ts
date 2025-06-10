import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { Reading } from '../entities/reading.entity';

@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get()
  findAll(): Promise<Reading[]> {
    return this.readingService.findAll();
  }

  @Post()
  create(@Body() reading: Reading): Promise<Reading> {
    return this.readingService.create(reading);
  }
}
