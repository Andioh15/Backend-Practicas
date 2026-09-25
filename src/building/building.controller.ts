import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { BuildingService } from './building.service';
import { Buildings } from '../entities/buildings.entity';

@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Get()
  findAll(): Promise<Buildings[]> {
    return this.buildingService.findAll();
  }

  @Get('block/:id_block')
  findByBlock(@Param('id_block') id_block: number): Promise<Buildings[]> {
    return this.buildingService.findByBlock(id_block);
  }

  @Post()
  create(@Body() building: Buildings): Promise<Buildings> {
    return this.buildingService.create(building);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Buildings>): Promise<Buildings> {
    return this.buildingService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.buildingService.delete(id);
  }
}
