import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { UsersModule } from './users/users.module';
import { CampusModule } from './campus/campus.module';
import { BlockModule } from './block/block.module';
import { BuildingModule } from './building/building.module';
import { RoomModule } from './room/room.module';
import { SensorModule } from './sensor/sensor.module';
import { ReadingModule } from './reading/reading.module';
import { ReportsModule } from './reports/reports.module';
import { report } from 'process';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST,
      username: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: {
    rejectUnauthorized: false, // Esto permite certificados autofirmados (común en desarrollo)
  },
  // O en algunas versiones antiguas simplemente:
  // ssl: true, 
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
    }),
    UsersModule,
    CampusModule,
    BlockModule,
    BuildingModule,
    RoomModule,
    SensorModule,
    ReadingModule,
    ReportsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


