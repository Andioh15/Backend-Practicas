import { Controller, Get, Post, Body } from '@nestjs/common';
import { BlockService } from './block.service';
import { Block } from '../entities/block.entity';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Get()
  findAll(): Promise<Block[]> {
    return this.blockService.findAll();
  }

  @Post()
  create(@Body() block: Block): Promise<Block> {
    return this.blockService.create(block);
  }
}
