import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  create(block: Blocks): Promise<Blocks> {
    return this.blockRepository.save(block);
  }
}
