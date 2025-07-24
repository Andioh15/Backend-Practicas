import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { Readings } from '../entities/readings.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get()
  findAll(): Promise<Readings[]> {
    return this.readingService.findAll();
  }

  
  @Post()
  create(@Body() dto: CreateReadingDto): Promise<Readings> {
    return this.readingService.create(dto);
  }

  @Get('summary-db')
  getAverageSummaryFromDB() {
    return this.readingService.getAverageSummaryFromDB();
  }
}



