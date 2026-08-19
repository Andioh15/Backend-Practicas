import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
