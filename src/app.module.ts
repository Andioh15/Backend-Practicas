import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from './users/users.module';
import { CampusModule } from './campus/campus.module';
import { BlockModule } from './block/block.module';
import { BuildingModule } from './building/building.module';
import { RoomModule } from './room/room.module';
import { SensorModule } from './sensor/sensor.module';
import { ReadingModule } from './reading/reading.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST,
      username: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
      retryAttempts: 3,
      retryDelay: 3000,
    }),
    UsersModule,
    CampusModule,
    BlockModule,
    BuildingModule,
    RoomModule,
    SensorModule,
    ReadingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
