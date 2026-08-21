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
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ProfessorModule } from './professor/professor.module';
import { ScheduleModule as ClassScheduleModule } from './schedule/schedule.module';
import { SubjectModule } from './subject/subject.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD),
      database: process.env.DB_NAME ,
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
    UsersModule,
    CampusModule,
    BlockModule,
    BuildingModule,
    RoomModule,
    SensorModule,
    ReadingModule,
    ReportsModule,
    ProfessorModule,
    ClassScheduleModule,
    ScheduleModule,
    SubjectModule,
    WhatsAppModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}