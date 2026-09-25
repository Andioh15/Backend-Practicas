import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
import { Blocks } from '../entities/blocks.entity';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(Blocks)
    private blockRepository: Repository<Blocks>,
  ) {}

  findAll(): Promise<Blocks[]> {
    return this.blockRepository.find();
  }

  async create(block: Blocks): Promise<Blocks> {
    try {
      return await this.blockRepository.save(block);
    } catch (error) {
      rethrowDbError(error, 'el bloque');
    }
  }

  async findOne(id: number): Promise<Blocks> {
    const item = await this.blockRepository.findOneBy({ block_id: id });
    if (!item) throw new NotFoundException(`No existe el bloque con ID ${id}`);
    return item;
  }

  async update(id: number, data: Partial<Blocks>): Promise<Blocks> {
    await this.findOne(id);
    const { block_id: _ignored, ...changes } = data;
    try {
      await this.blockRepository.update(id, changes);
    } catch (error) {
      rethrowDbError(error, 'el bloque');
    }
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.blockRepository.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el bloque');
    }
  }
}
