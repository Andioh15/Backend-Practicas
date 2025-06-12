import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Buildings } from '../entities/buildings.entity';

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(Buildings)
    private buildingRepository: Repository<Buildings>,
  ) {}

  findAll(): Promise<Buildings[]> {
    return this.buildingRepository.find();
  }

  create(building: Buildings): Promise<Buildings> {
    return this.buildingRepository.save(building);
  }
}
