import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // <--- 1. IMPORTAR ESTO (Para conectar a VCOM)
import { ConfigModule } from '@nestjs/config'; // <--- 2. IMPORTAR ESTO (Para leer el .env)
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity'; 
import { ReadingService } from './reading.service';
import { ReadingController } from './reading.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Readings, Sensors]),
    HttpModule,   
    ConfigModule, 
  ],
  controllers: [ReadingController],
  providers: [ReadingService],
})
export class ReadingModule {}