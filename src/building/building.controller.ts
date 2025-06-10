import { Controller, Get, Post, Body } from '@nestjs/common';
import { BuildingService } from './building.service';
import { Building } from '../entities/building.entity';

@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Get()
  findAll(): Promise<Building[]> {
    return this.buildingService.findAll();
  }

  @Post()
  create(@Body() building: Building): Promise<Building> {
    return this.buildingService.create(building);
  }
}
