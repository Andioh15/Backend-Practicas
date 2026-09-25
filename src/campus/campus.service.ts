import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
import { Campus } from '../entities/campuses.entity';

@Injectable()
export class CampusService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,
  ) {}

  findAll(): Promise<Campus[]> {
    return this.campusRepository.find();
  }

  async create(campus: Campus): Promise<Campus> {
    try {
      return await this.campusRepository.save(campus);
    } catch (error) {
      rethrowDbError(error, 'el campus');
    }
  }

  async findOne(id: number): Promise<Campus> {
    const item = await this.campusRepository.findOneBy({ campus_id: id });
    if (!item) throw new NotFoundException(`No existe el campus con ID ${id}`);
    return item;
  }

  async update(id: number, data: Partial<Campus>): Promise<Campus> {
    await this.findOne(id);
    const { campus_id: _ignored, ...changes } = data;
    try {
      await this.campusRepository.update(id, changes);
    } catch (error) {
      rethrowDbError(error, 'el campus');
    }
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.campusRepository.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el campus');
    }
  }
}
