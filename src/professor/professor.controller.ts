import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ProfessorService } from './professor.service';

@Controller('professors')
export class ProfessorController {
  constructor(private readonly professorService: ProfessorService) {}

  @Get()
  getAll() { return this.professorService.findAll(); }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.professorService.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.professorService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.professorService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.professorService.delete(id); }
}