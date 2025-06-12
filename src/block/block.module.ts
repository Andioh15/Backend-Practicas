import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blocks } from '../entities/blocks.entity';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Blocks])],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule {}
