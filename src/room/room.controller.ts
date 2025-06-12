import { Controller, Get, Post, Body } from '@nestjs/common';
import { RoomService } from './room.service';
import { Rooms } from '../entities/rooms.entity';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll(): Promise<Rooms[]> {
    return this.roomService.findAll();
  }

  @Post()
  create(@Body() room: Rooms): Promise<Rooms> {
    return this.roomService.create(room);
  }
}
