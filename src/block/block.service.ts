import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(Block)
    private blockRepository: Repository<Block>,
  ) {}

  findAll(): Promise<Block[]> {
    return this.blockRepository.find();
  }

  create(block: Block): Promise<Block> {
    return this.blockRepository.save(block);
  }
}
