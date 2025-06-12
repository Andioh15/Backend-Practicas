import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { Readings} from '../entities/readings.entity';

@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get()
  findAll(): Promise<Readings[]> {
    return this.readingService.findAll();
  }

  @Post()
  create(@Body() reading: Readings): Promise<Readings> {
    return this.readingService.create(reading);
  }
}
