import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CampusService } from './campus.service';
import { Campus } from '../entities/campuses.entity';

@Controller('campus')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get()
  findAll(): Promise<Campus[]> {
    return this.campusService.findAll();
  }

  @Post()
  create(@Body() campus: Campus): Promise<Campus> {
    return this.campusService.create(campus);
  }
}
