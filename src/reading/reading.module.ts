import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Readings } from '../entities/readings.entity';
import { ReadingService } from './reading.service';
import { ReadingController } from './reading.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Readings])],
  controllers: [ReadingController],
  providers: [ReadingService],
})
export class ReadingModule {}
