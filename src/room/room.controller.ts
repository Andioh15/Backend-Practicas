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

  @Get('building/:id_building')
  findByBuilding(@Body('id_building') id_building: number): Promise<Rooms[]> {
    return this.roomService.findByBuilding(id_building);
  }

  @Post()
  create(@Body() room: Rooms): Promise<Rooms> {
    return this.roomService.create(room);
  }
}
