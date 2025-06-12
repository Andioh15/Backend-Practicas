import { Controller, Get, Post, Body } from '@nestjs/common';
import { BuildingService } from './building.service';
import { Buildings } from '../entities/buildings.entity';

@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Get()
  findAll(): Promise<Buildings[]> {
    return this.buildingService.findAll();
  }

  @Post()
  create(@Body() building: Buildings): Promise<Buildings> {
    return this.buildingService.create(building);
  }
}
