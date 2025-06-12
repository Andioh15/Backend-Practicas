import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Buildings } from '../entities/buildings.entity';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Buildings])],
  controllers: [BuildingController],
  providers: [BuildingService],
})
export class BuildingModule {}

