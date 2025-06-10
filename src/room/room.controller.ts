import { Controller, Get, Post, Body } from '@nestjs/common';
import { RoomService } from './room.service';
import { Room } from '../entities/room.entity';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll(): Promise<Room[]> {
    return this.roomService.findAll();
  }

  @Post()
  create(@Body() room: Room): Promise<Room> {
    return this.roomService.create(room);
  }
}
