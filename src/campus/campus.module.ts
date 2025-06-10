import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campus } from '../entities/campus.entity';
import { CampusService } from './campus.service';
import { CampusController } from './campus.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Campus])],
  controllers: [CampusController],
  providers: [CampusService],
})
export class CampusModule {}
