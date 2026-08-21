import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { SubjectService } from './subject.service';

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  getAll() { return this.subjectService.findAll(); }

  @Get(':id')
  getOne(@Param('id') id: number) { return this.subjectService.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.subjectService.create(body); }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) { return this.subjectService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: number) { return this.subjectService.delete(id); }
}
