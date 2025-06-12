import { Controller, Get, Post, Body } from '@nestjs/common';
import { BlockService } from './block.service';
import { Blocks } from '../entities/blocks.entity';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Get()
  findAll(): Promise<Blocks[]> {
    return this.blockService.findAll();
  }

  @Post()
  create(@Body() block: Blocks): Promise<Blocks> {
    return this.blockService.create(block);
  }
}
