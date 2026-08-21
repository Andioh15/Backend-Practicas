import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getAll() { return this.scheduleService.findAll(); }

  @Get(':id')
  getOne(@Param('id') id: number) { return this.scheduleService.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.scheduleService.create(body); }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) { return this.scheduleService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: number) { return this.scheduleService.delete(id); }
}