import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
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

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Campus>): Promise<Campus> {
    return this.campusService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.campusService.delete(id);
  }
}
