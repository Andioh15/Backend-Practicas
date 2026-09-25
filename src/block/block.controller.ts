import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
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

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Blocks>): Promise<Blocks> {
    return this.blockService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.blockService.delete(id);
  }
}
