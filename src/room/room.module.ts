import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rooms } from '../entities/rooms.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Rooms])],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
