import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
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

  findByBlock(id_block: number): Promise<Buildings[]> {
    return this.buildingRepository.find({ where: { block_id: id_block } });
  }

  async create(building: Buildings): Promise<Buildings> {
    try {
      return await this.buildingRepository.save(building);
    } catch (error) {
      rethrowDbError(error, 'el edificio');
    }
  }

  async findOne(id: number): Promise<Buildings> {
    const item = await this.buildingRepository.findOneBy({ building_id: id });
    if (!item) throw new NotFoundException(`No existe el edificio con ID ${id}`);
    return item;
  }

  async update(id: number, data: Partial<Buildings>): Promise<Buildings> {
    await this.findOne(id);
    const { building_id: _ignored, ...changes } = data;
    try {
      await this.buildingRepository.update(id, changes);
    } catch (error) {
      rethrowDbError(error, 'el edificio');
    }
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.buildingRepository.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el edificio');
    }
  }
}
