import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../entities/building.entity';

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(Building)
    private buildingRepository: Repository<Building>,
  ) {}

  findAll(): Promise<Building[]> {
    return this.buildingRepository.find();
  }

  create(building: Building): Promise<Building> {
    return this.buildingRepository.save(building);
  }
}
